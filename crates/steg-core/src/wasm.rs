//! `wasm-bindgen` surface. This is the only file that knows about JavaScript.
//!
//! Everything crosses the boundary as `Uint8Array` (copied in and out) or as plain
//! structs, so no Rust-owned memory is ever handed to JS and there is nothing to free
//! on the JS side beyond normal GC.

use crate::append as ap;
use crate::crypto as cx;
use crate::format;
use crate::lsb as ls;
use crate::{Error, Result};
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// Bridge `Result<T>` to a JS `Result<T, JsValue>` with a readable message.
fn js<T>(r: Result<T>) -> std::result::Result<T, JsValue> {
    r.map_err(|e| JsValue::from_str(&e.to_string()))
}

// ---------------------------------------------------------------------------
// Serialisable DTOs
// ---------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbedReport {
    bits_written: usize,
    bits_capacity: usize,
    carriers: usize,
    payload_bytes: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractReport {
    payload: Vec<u8>,
    encrypted: bool,
    two_planes: bool,
    carrier_offset: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrailerDto {
    name: String,
    mime: String,
    payload: Vec<u8>,
    offset: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecoyDto {
    /// The original decoy with the hidden payload removed.
    decoy: Vec<u8>,
    trailer: TrailerDto,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CarveDto {
    offset: usize,
    kind: String,
    mime: String,
    length: Option<usize>,
    suggested_name: String,
    /// The carved bytes, ready to hand to the browser as a `Blob`.
    payload: Vec<u8>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Version {
    core: &'static str,
    container: u8,
    kdf_iterations: u16,
    platform: &'static str,
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

fn cfg_from(planes: u8, skip_transparent: bool) -> ls::LsbConfig {
    ls::LsbConfig { planes, skip_transparent, ..Default::default() }
}

// ---------------------------------------------------------------------------
// Method A — LSB
// ---------------------------------------------------------------------------

/// Bits the image can hold under the given configuration.
#[wasm_bindgen]
pub fn lsb_capacity_bits(rgba: &[u8], width: u32, height: u32, planes: u8) -> u32 {
    let cfg = cfg_from(planes, true);
    ls::capacity_bits(rgba, width as usize, height as usize, &cfg) as u32
}

/// Number of fully opaque carrier pixels.
#[wasm_bindgen]
pub fn lsb_carrier_count(rgba: &[u8], width: u32, height: u32) -> u32 {
    let cfg = cfg_from(1, true);
    ls::carrier_count(rgba, width as usize, height as usize, &cfg) as u32
}

/// Embed `payload` into the low bits of `rgba` (mutated in place).
#[wasm_bindgen]
pub fn lsb_embed(
    rgba: &mut [u8],
    width: u32,
    height: u32,
    payload: &[u8],
    encrypted: bool,
    planes: u8,
) -> std::result::Result<EmbedReport, JsValue> {
    let cfg = cfg_from(planes, true);
    let payload_bytes = payload.len();
    js(ls::embed(rgba, width as usize, height as usize, payload, encrypted, &cfg)).map(|r| {
        EmbedReport {
            bits_written: r.bits_written,
            bits_capacity: r.bits_capacity,
            carriers: r.carriers,
            payload_bytes,
        }
    })
}

/// Read the LSB payload back out of `rgba`.
#[wasm_bindgen]
pub fn lsb_extract(rgba: &[u8], width: u32, height: u32) -> std::result::Result<ExtractReport, JsValue> {
    let cfg = cfg_from(1, true);
    // Re-read the planes flag from a first pass so `skip_transparent` stays in sync.
    let report = match ls::extract(rgba, width as usize, height as usize, &cfg) {
        Ok(r) => r,
        // The container may have been written with two planes; try that before failing.
        Err(Error::NoContainer) => {
            let cfg2 = cfg_from(2, true);
            ls::extract(rgba, width as usize, height as usize, &cfg2)?
        }
        Err(e) => return Err(JsValue::from_str(&e.to_string())),
    };
    Ok(ExtractReport {
        payload: report.payload,
        encrypted: report.flags.encrypted,
        two_planes: report.flags.two_planes,
        carrier_offset: report.carrier_offset,
    })
}

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

/// Browser CSPRNG: `crypto.getRandomValues` in 64 KiB chunks.
struct WebRng;

impl cx::Rng for WebRng {
    fn fill(&mut self, buf: &mut [u8]) {
        let crypto = web_sys::window()
            .and_then(|w| w.crypto())
            .expect("crypto.getRandomValues requires a secure context");
        // `get_random_values_with_u8_array` throws above 64 KiB.
        for chunk in buf.chunks_mut(65_536) {
            crypto.get_random_values_with_u8_array(chunk).expect("CSPRNG failure");
        }
    }
}

/// PBKDF2 rounds the JS mirror should default to.
#[wasm_bindgen]
pub fn kdf_iterations() -> u32 {
    cx::KDF_ITERATIONS as u32
}

/// Seal `plaintext` into a `STGECRY1` envelope.
#[wasm_bindgen]
pub fn seal(plaintext: &[u8], passphrase: &str) -> std::result::Result<Vec<u8>, JsValue> {
    js(cx::seal(plaintext, passphrase.as_bytes(), cx::KDF_ITERATIONS, &mut WebRng))
}

/// Open a `STGECRY1` envelope. Returns an error for both a wrong passphrase and a
/// tampered payload — deliberately indistinguishable.
#[wasm_bindgen]
pub fn unseal(envelope: &[u8], passphrase: &str) -> std::result::Result<Vec<u8>, JsValue> {
    js(cx::unseal(envelope, passphrase.as_bytes()))
}

/// Cheap check so the UI can label an extracted payload without attempting decryption.
#[wasm_bindgen]
pub fn is_envelope(bytes: &[u8]) -> bool {
    cx::is_envelope(bytes)
}

// ---------------------------------------------------------------------------
// Method B — trailing file
// ---------------------------------------------------------------------------

/// Wrap `payload` in a trailer and attach it to `decoy`.
///
/// For a PNG decoy the trailer is written into a private ancillary chunk so the output
/// remains a spec-valid PNG; otherwise it is appended after the EOF marker.
#[wasm_bindgen]
pub fn attach(
    decoy: &[u8],
    name: &str,
    mime: &str,
    payload: &[u8],
) -> std::result::Result<Vec<u8>, JsValue> {
    let trailer = js(ap::build_trailer(name, mime, payload))?;
    js(ap::attach_trailer(decoy, &trailer))
}

/// Extract the hidden file and rebuild the original decoy.
#[wasm_bindgen]
pub fn detach(container: &[u8]) -> std::result::Result<DecoyDto, JsValue> {
    let (trailer, decoy) = js(ap::detach_trailer(container))?;
    Ok(DecoyDto {
        decoy,
        trailer: TrailerDto {
            name: trailer.name,
            mime: trailer.mime,
            payload: trailer.payload,
            offset: trailer.offset,
        },
    })
}

/// Inspect the bytes past the image's EOF marker for well-known file signatures.
///
/// `search_from` should be the offset where the image data actually ends; see
/// `image_eof_offset`.
#[wasm_bindgen]
pub fn carve(container: &[u8], search_from: u32) -> Vec<CarveDto> {
    let from = search_from as usize;
    ap::carve_candidates(container, from)
        .into_iter()
        .map(|c| {
            let start = c.offset.min(container.len());
            // `length` is the exact archive size when we could determine it (ZIP via its
            // EOCD record); otherwise carve to EOF.
            let end = c.length.map(|l| start.saturating_add(l)).unwrap_or(container.len());
            let end = end.clamp(start, container.len());
            CarveDto {
                offset: c.offset,
                kind: c.kind.to_string(),
                mime: c.mime.to_string(),
                length: c.length,
                suggested_name: c.suggested_name,
                payload: container[start..end].to_vec(),
            }
        })
        .collect()
}

/// Where the image payload really ends, i.e. the first byte available to hide data in.
///
/// For PNG this is the end of the `IEND` chunk; for JPEG it is just past the final
/// `FF D9` EOI marker. Both point the forensic scanner at the trailing region.
#[wasm_bindgen]
pub fn image_eof_offset(bytes: &[u8]) -> u32 {
    if let Some(iend) = format::png_iend_offset(bytes) {
        let len = u32::from_be_bytes([bytes[iend], bytes[iend + 1], bytes[iend + 2], bytes[iend + 3]])
            as usize;
        if let Some(end) = iend.checked_add(12).and_then(|v| v.checked_add(len)) {
            return end.min(bytes.len()) as u32;
        }
    }
    if format::is_png(bytes) {
        return bytes.len() as u32;
    }
    // JPEG: the last EOI marker in the file.
    if bytes.len() >= 2 {
        let mut i = bytes.len() - 2;
        loop {
            if bytes[i] == 0xFF && bytes[i + 1] == 0xD9 {
                return (i + 2) as u32;
            }
            if i == 0 {
                break;
            }
            i -= 1;
        }
    }
    bytes.len() as u32
}

/// Container format version, useful for asserting the JS and WASM cores agree.
#[wasm_bindgen]
pub fn version() -> Version {
    Version {
        core: env!("CARGO_PKG_VERSION"),
        container: format::VERSION,
        kdf_iterations: cx::KDF_ITERATIONS,
        platform: if cfg!(target_arch = "wasm32") { "wasm32" } else { "native" },
    }
}
