//! masc steganography core.
//!
//! Pure, allocation-conscious logic with no knowledge of the DOM. Everything here is
//! spec'd in `docs/STEGO_FORMAT.md` and mirrored byte-for-byte by the TypeScript
//! implementation in `src/lib/steg/core.ts`.
//!
//! The `wasm` module is the only place that touches JavaScript; the rest compiles and
//! unit-tests natively with `cargo test`.

pub mod append;
pub mod crypto;
pub mod format;
pub mod lsb;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

pub use append::{
    attach_trailer, build_trailer, carve_candidates, decode_trailer, detach_trailer, CarveCandidate,
    Trailer,
};
pub use crypto::{seal, unseal, Rng, RngError, KDF_ITERATIONS};
pub use format::{LSB_HEADER_LEN, LSB_MAGIC, TRAILER_MAGIC, VERSION};
pub use lsb::{
    capacity_bits, carrier_count, embed, extract, EmbedReport, ExtractReport, LsbConfig, LsbError,
};

/// A single error type for the whole core. The WASM layer stringifies it; the TypeScript
/// layer throws a matching `Error` with the same message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    /// Payload does not fit in the carrier image.
    CapacityExceeded { needed: usize, available: usize },
    /// The 8-byte magic was never found while scanning.
    NoContainer,
    /// The magic matched but the structure around it did not.
    Malformed(String),
    /// Container parsed, but the CRC-32 of the payload did not match.
    ChecksumMismatch { expected: u32, actual: u32 },
    /// The payload is an encrypted envelope and the passphrase was wrong or missing.
    BadPassphrase,
    /// Cryptographic failure while sealing/unsealing.
    Crypto(String),
    /// Not enough bytes left to read the field the parser wanted.
    Truncated,
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Error::CapacityExceeded { needed, available } => write!(
                f,
                "payload needs {needed} bits but the image only offers {available} bits"
            ),
            Error::NoContainer => write!(f, "no masc container found in these bytes"),
            Error::Malformed(why) => write!(f, "malformed container: {why}"),
            Error::ChecksumMismatch { expected, actual } => write!(
                f,
                "checksum mismatch: header says 0x{expected:08x}, payload hashes to 0x{actual:08x}"
            ),
            Error::BadPassphrase => write!(f, "wrong passphrase, or the payload was re-compressed"),
            Error::Crypto(e) => write!(f, "crypto failure: {e}"),
            Error::Truncated => write!(f, "unexpected end of input"),
        }
    }
}

impl std::error::Error for Error {}

/// Convenience alias used throughout the crate.
pub type Result<T> = std::result::Result<T, Error>;
