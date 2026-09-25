//! Optional confidentiality layer: PBKDF2-HMAC-SHA256 + AES-256-GCM.
//!
//! **Steganography hides data; it does not protect it.** Anyone who can run the decoder
//! can read whatever was embedded. When the user supplies a passphrase, the payload is
//! sealed into an authenticated envelope first, so the carrier is useless on its own.
//!
//! Layout is normative in `docs/STEGO_FORMAT.md` §2. The TypeScript mirror in
//! `src/lib/steg/crypto.ts` must produce byte-identical envelopes.

use crate::format::ENVELOPE_MAGIC;
use crate::{Error, Result};
use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use hmac::Hmac;
use sha2::Sha256;

/// PBKDF2 rounds used when the caller does not override them.
pub const KDF_ITERATIONS: u16 = 210_000;

const SALT_LEN: usize = 32;
const IV_LEN: usize = 12;
const FIXED_HEADER_LEN: usize = 60;
const MAX_ENVELOPE_LEN: usize = 1 << 30;

/// Additional authenticated data. Binding the envelope to a format version stops a
/// valid envelope from being transplanted into a future container version.
const AAD: &[u8] = b"masc-steg-v1";

/// Source of cryptographically secure random bytes.
///
/// Abstracted so the pure logic can be unit-tested on a machine with no OS CSPRNG, and
/// so the WASM layer can use the browser's `crypto.getRandomValues`.
pub trait Rng {
    fn fill(&mut self, buf: &mut [u8]);
}

/// An RNG that always returns the same bytes. **Test use only.**
pub struct FixedRng(pub u8);
impl Rng for FixedRng {
    fn fill(&mut self, buf: &mut [u8]) {
        buf.fill(self.0);
    }
}

/// Seal `plaintext` into an authenticated envelope using `passphrase`.
///
/// `iterations` is written into the header so the round count can be raised later
/// without breaking old containers.
pub fn seal(plaintext: &[u8], passphrase: &[u8], iterations: u16, rng: &mut dyn Rng) -> Result<Vec<u8>> {
    if iterations == 0 {
        return Err(Error::Crypto("refusing to run PBKDF2 with 0 iterations".into()));
    }

    let mut salt = [0u8; SALT_LEN];
    let mut iv = [0u8; IV_LEN];
    rng.fill(&mut salt);
    rng.fill(&mut iv);

    let key = derive_key(passphrase, &salt, iterations);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| Error::Crypto(format!("key init failed: {e}")))?;

    // The 16-byte GCM tag is appended by `encrypt`.
    let ct = cipher
        .encrypt(Nonce::from_slice(&iv), Payload { msg: plaintext, aad: AAD })
        .map_err(|e| Error::Crypto(format!("encrypt failed: {e}")))?;

    let mut out = Vec::with_capacity(FIXED_HEADER_LEN + ct.len());
    out.extend_from_slice(ENVELOPE_MAGIC);
    out.extend_from_slice(&iterations.to_le_bytes());
    out.push(SALT_LEN as u8);
    out.extend_from_slice(&salt);
    out.push(IV_LEN as u8);
    out.extend_from_slice(&iv);
    out.extend_from_slice(&(ct.len() as u32).to_le_bytes());
    out.extend_from_slice(&ct);
    debug_assert_eq!(out.len(), FIXED_HEADER_LEN + ct.len());
    Ok(out)
}

/// Open an envelope produced by [`seal`].
///
/// A wrong passphrase and a tampered ciphertext both surface as
/// [`Error::BadPassphrase`] on purpose — GCM cannot tell them apart, and telling the
/// user which one it was would be an oracle.
pub fn unseal(envelope: &[u8], passphrase: &[u8]) -> Result<Vec<u8>> {
    if envelope.len() < FIXED_HEADER_LEN || &envelope[..8] != ENVELOPE_MAGIC {
        return Err(Error::Malformed("not a STGECRY1 envelope".into()));
    }
    if envelope.len() > MAX_ENVELOPE_LEN {
        return Err(Error::Malformed("envelope is implausibly large".into()));
    }

    let iterations = u16::from_le_bytes([envelope[8], envelope[9]]);
    if iterations == 0 {
        return Err(Error::Malformed("envelope declares 0 PBKDF2 iterations".into()));
    }

    let salt_len = envelope[10] as usize;
    if salt_len == 0 || salt_len > 64 {
        return Err(Error::Malformed(format!("bad salt length {salt_len}")));
    }
    let iv_at = 11 + salt_len;
    if iv_at + 1 > envelope.len() {
        return Err(Error::Truncated);
    }
    let iv_len = envelope[iv_at] as usize;
    if iv_len != IV_LEN {
        return Err(Error::Malformed(format!("bad IV length {iv_len}")));
    }
    let len_at = iv_at + 1 + iv_len;
    if len_at + 4 > envelope.len() {
        return Err(Error::Truncated);
    }
    let ct_len = u32::from_le_bytes([
        envelope[len_at],
        envelope[len_at + 1],
        envelope[len_at + 2],
        envelope[len_at + 3],
    ]) as usize;
    let ct_start = len_at + 4;
    if ct_start + ct_len != envelope.len() {
        return Err(Error::Malformed("ciphertext length does not match envelope size".into()));
    }

    let salt = &envelope[11..iv_at];
    let iv = &envelope[iv_at + 1..len_at];
    let key = derive_key(passphrase, salt, iterations);
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| Error::Crypto(format!("key init: {e}")))?;

    cipher
        .decrypt(
            Nonce::from_slice(iv),
            Payload { msg: &envelope[ct_start..], aad: AAD },
        )
        .map_err(|_| Error::BadPassphrase)
}

/// True when `bytes` looks like a `STGECRY1` envelope.
pub fn is_envelope(bytes: &[u8]) -> bool {
    bytes.len() >= FIXED_HEADER_LEN && &bytes[..8] == ENVELOPE_MAGIC
}

fn derive_key(passphrase: &[u8], salt: &[u8], iterations: u16) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2::<Hmac<Sha256>>(passphrase, salt, iterations as u32, &mut key);
    key
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let mut rng = FixedRng(0xA7);
        let sealed = seal(b"the eagle lands at dawn", b"correct horse", 1_000, &mut rng).unwrap();
        assert!(is_envelope(&sealed));
        let opened = unseal(&sealed, b"correct horse").unwrap();
        assert_eq!(opened, b"the eagle lands at dawn");
    }

    #[test]
    fn wrong_passphrase_is_rejected() {
        let mut rng = FixedRng(0x11);
        let sealed = seal(b"secret", b"right", 1_000, &mut rng).unwrap();
        assert_eq!(unseal(&sealed, b"wrong").unwrap_err(), Error::BadPassphrase);
    }

    #[test]
    fn tampered_ciphertext_is_rejected() {
        let mut rng = FixedRng(0x22);
        let mut sealed = seal(b"secret", b"right", 1_000, &mut rng).unwrap();
        let last = sealed.len() - 1;
        sealed[last] ^= 0x01;
        assert_eq!(unseal(&sealed, b"right").unwrap_err(), Error::BadPassphrase);
    }

    #[test]
    fn deterministic_kdf_matches_known_vector() {
        // RFC 6070-style check adapted to SHA-256, vector from the PBKDF2-HMAC-SHA256
        // test suite: password "password", salt "salt", 1 iteration.
        let key = derive_key(b"password", b"salt", 1);
        assert_eq!(
            key.iter().map(|b| format!("{b:02x}")).collect::<String>(),
            "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b"
        );
    }
}
