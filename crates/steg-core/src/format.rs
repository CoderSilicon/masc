//! Magic numbers, header layout and the PNG chunk helpers.
//!
//! See `docs/STEGO_FORMAT.md` §1.2 and §3.2 for the normative description.

use crate::Error;

/// Magic that introduces an LSB bitstream, followed by a version byte.
pub const LSB_MAGIC: &[u8; 8] = b"STEGLSB1";
/// Magic that introduces a trailing-file trailer.
pub const TRAILER_MAGIC: &[u8; 8] = b"STEGAPP1";
/// Magic that introduces an encrypted envelope.
pub const ENVELOPE_MAGIC: &[u8; 8] = b"STGECRY1";

/// Container format version. Bump when the header layout changes.
pub const VERSION: u8 = 1;

/// LSB header size in bytes: magic(8) + version(1) + flags(1) + reserved(2) + len(4) + crc(4).
pub const LSB_HEADER_LEN: usize = 20;

/// `flags` bit 0 — the payload is an encrypted envelope.
pub const FLAG_ENCRYPTED: u8 = 0b0000_0001;
/// `flags` bit 1 — two LSB planes per channel were used.
pub const FLAG_TWO_PLANES: u8 = 0b0000_0010;

/// PNG file signature.
pub const PNG_SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];

/// Private ancillary chunk type used to carry a trailer inside a PNG.
/// See `docs/STEGO_FORMAT.md` §3.2 for the bit-meaning of each letter.
pub const PNG_TRAILER_CHUNK: &[u8; 4] = b"stEg";

// ---------------------------------------------------------------------------
// PNG primitives
// ---------------------------------------------------------------------------

#[inline]
pub fn is_png(bytes: &[u8]) -> bool {
    bytes.len() >= 8 && bytes[..8] == PNG_SIGNATURE
}

/// Byte offset of the `IEND` chunk's length field, or `None` if the file is not a
/// well-formed PNG stream.
///
/// Walks every chunk so we never mistake chunk *data* for a chunk header.
pub fn png_iend_offset(bytes: &[u8]) -> Option<usize> {
    if !is_png(bytes) {
        return None;
    }
    let mut pos = 8usize;
    while pos + 8 <= bytes.len() {
        let len = u32::from_be_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]])
            as usize;
        let kind = &bytes[pos + 4..pos + 8];
        if kind == b"IEND" {
            return Some(pos);
        }
        // length field + type + data + crc
        let next = pos.checked_add(12)?.checked_add(len)?;
        if next > bytes.len() {
            return None;
        }
        pos = next;
    }
    None
}

/// Every `(chunk_start_offset, chunk_type)` pair in a PNG, in stream order.
pub fn png_chunks(bytes: &[u8]) -> Vec<(usize, [u8; 4])> {
    let mut out = Vec::new();
    if !is_png(bytes) {
        return out;
    }
    let mut pos = 8usize;
    while pos + 8 <= bytes.len() {
        let len = u32::from_be_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]])
            as usize;
        if pos + 4 > bytes.len() {
            break;
        }
        let mut kind = [0u8; 4];
        kind.copy_from_slice(&bytes[pos + 4..pos + 8]);
        out.push((pos, kind));
        let Some(next) = pos.checked_add(12).and_then(|v| v.checked_add(len)) else {
            break;
        };
        if next > bytes.len() {
            break;
        }
        pos = next;
    }
    out
}

/// Serialise `data` as a PNG chunk (length + type + data + CRC-32).
pub fn png_chunk(kind: &[u8; 4], data: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(12 + data.len());
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    out.extend_from_slice(kind);
    out.extend_from_slice(data);
    // CRC covers the type and the data, but not the length field.
    let mut hasher = crc32fast::Hasher::new();
    hasher.update(kind);
    hasher.update(data);
    out.extend_from_slice(&hasher.finalize().to_be_bytes());
    out
}

// ---------------------------------------------------------------------------
// LSB header
// ---------------------------------------------------------------------------

/// Flags byte carried in the LSB header.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Flags {
    pub encrypted: bool,
    pub two_planes: bool,
}

impl Flags {
    pub fn to_byte(self) -> u8 {
        let mut b = 0u8;
        if self.encrypted {
            b |= FLAG_ENCRYPTED;
        }
        if self.two_planes {
            b |= FLAG_TWO_PLANES;
        }
        b
    }

    pub fn from_byte(b: u8) -> Self {
        Flags {
            encrypted: b & FLAG_ENCRYPTED != 0,
            two_planes: b & FLAG_TWO_PLANES != 0,
        }
    }
}

/// Parsed LSB container header.
#[derive(Debug, Clone, Copy)]
pub struct LsbHeader {
    pub flags: Flags,
    pub payload_len: u32,
    pub payload_crc32: u32,
}

/// Serialise a header into exactly [`LSB_HEADER_LEN`] bytes.
pub fn pack_lsb_header(flags: Flags, payload: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(LSB_HEADER_LEN);
    out.extend_from_slice(LSB_MAGIC);
    out.push(VERSION);
    out.push(flags.to_byte());
    out.extend_from_slice(&[0u8, 0u8]); // reserved
    out.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    out.extend_from_slice(&crc32fast::hash(payload).to_le_bytes());
    debug_assert_eq!(out.len(), LSB_HEADER_LEN);
    out
}

/// Parse a 20-byte LSB header from the front of `buf`.
pub fn unpack_lsb_header(buf: &[u8]) -> Result<LsbHeader, Error> {
    if buf.len() < LSB_HEADER_LEN {
        return Err(Error::Truncated);
    }
    if &buf[..8] != LSB_MAGIC {
        return Err(Error::NoContainer);
    }
    if buf[8] != VERSION {
        return Err(Error::Malformed(format!(
            "unsupported container version {}",
            buf[8]
        )));
    }
    Ok(LsbHeader {
        flags: Flags::from_byte(buf[9]),
        payload_len: u32::from_le_bytes([buf[12], buf[13], buf[14], buf[15]]),
        payload_crc32: u32::from_le_bytes([buf[16], buf[17], buf[18], buf[19]]),
    })
}
