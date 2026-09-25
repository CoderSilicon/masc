//! Method B — appending a second file to the end of a decoy file.
//!
//! For PNGs the trailer goes into a private ancillary chunk so the output stays a
//! spec-valid PNG; for everything else it is concatenated after the EOF marker.
//! See `docs/STEGO_FORMAT.md` §3.

use crate::format::{
    is_png, png_chunk, png_chunks, png_iend_offset, TRAILER_MAGIC,
};
use crate::{Error, Result};

/// A decoded trailer: the hidden file plus the metadata needed to name it on the way out.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Trailer {
    pub name: String,
    pub mime: String,
    pub payload: Vec<u8>,
    /// Byte offset of the trailer inside the container file. Useful for forensics.
    pub offset: usize,
}

const NAME_MAX: usize = 1024;
const MIME_MAX: usize = 255;

/// Build a trailer around `payload`. `name` is the hidden file's original filename.
pub fn build_trailer(name: &str, mime: &str, payload: &[u8]) -> Result<Vec<u8>> {
    if name.len() > NAME_MAX {
        return Err(Error::Malformed(format!("filename too long ({} bytes)", name.len())));
    }
    if mime.len() > MIME_MAX {
        return Err(Error::Malformed("MIME type too long".into()));
    }
    if payload.len() > u32::MAX as usize {
        return Err(Error::Malformed("payload larger than 4 GiB".into()));
    }
    // Strip path separators so a crafted name cannot escape the download directory.
    let safe_name = name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("payload.bin")
        .to_string();

    let name_bytes = safe_name.as_bytes();
    let mime_bytes = mime.as_bytes();

    let mut out = Vec::with_capacity(18 + name_bytes.len() + mime_bytes.len() + payload.len());
    out.extend_from_slice(TRAILER_MAGIC);
    out.extend_from_slice(&(name_bytes.len() as u16).to_le_bytes());
    out.extend_from_slice(&(mime_bytes.len() as u16).to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes()); // reserved
    out.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    out.extend_from_slice(name_bytes);
    out.extend_from_slice(mime_bytes);
    out.extend_from_slice(payload);
    Ok(out)
}

/// Parse a trailer that starts exactly at `offset` in `bytes`.
pub fn decode_trailer(bytes: &[u8], offset: usize) -> Result<Trailer> {
    if offset + 18 > bytes.len() {
        return Err(Error::Truncated);
    }
    if &bytes[offset..offset + 8] != TRAILER_MAGIC {
        return Err(Error::NoContainer);
    }
    let name_len = u16::from_le_bytes([bytes[offset + 8], bytes[offset + 9]]) as usize;
    let mime_len = u16::from_le_bytes([bytes[offset + 10], bytes[offset + 11]]) as usize;
    let payload_len =
        u32::from_le_bytes([bytes[offset + 14], bytes[offset + 15], bytes[offset + 16], bytes[offset + 17]])
            as usize;

    if name_len > NAME_MAX || mime_len > MIME_MAX {
        return Err(Error::Malformed("trailer metadata length out of range".into()));
    }
    let meta_end = offset + 18 + name_len + mime_len;
    let end = meta_end.checked_add(payload_len).ok_or(Error::Truncated)?;
    if end > bytes.len() {
        return Err(Error::Truncated);
    }

    let name = String::from_utf8_lossy(&bytes[offset + 18..offset + 18 + name_len]).into_owned();
    let mime =
        String::from_utf8_lossy(&bytes[offset + 18 + name_len..meta_end]).into_owned();
    let payload = bytes[meta_end..end].to_vec();

    Ok(Trailer { name, mime, payload, offset })
}

/// Produce the stego'd container from `decoy` + `trailer`.
///
/// * PNG  → trailer is inserted as an `stEg` ancillary chunk just before `IEND`.
/// * other → `decoy || trailer`.
pub fn attach_trailer(decoy: &[u8], trailer: &[u8]) -> Result<Vec<u8>> {
    if is_png(decoy) {
        if let Some(iend) = png_iend_offset(decoy) {
            let mut out = Vec::with_capacity(decoy.len() + trailer.len() + 12);
            out.extend_from_slice(&decoy[..iend]);
            out.extend_from_slice(&png_chunk(crate::format::PNG_TRAILER_CHUNK, trailer));
            out.extend_from_slice(&decoy[iend..]);
            return Ok(out);
        }
        // Malformed PNG structure: fall through to a plain tail append, which still
        // extracts correctly, just without the "valid PNG" guarantee.
    }
    let mut out = Vec::with_capacity(decoy.len() + trailer.len());
    out.extend_from_slice(decoy);
    out.extend_from_slice(trailer);
    Ok(out)
}

/// Recover the trailer from a container, plus the reconstructed original decoy.
pub fn detach_trailer(container: &[u8]) -> Result<(Trailer, Vec<u8>)> {
    // 1. PNG private chunk (what `attach_trailer` produces).
    if is_png(container) {
        for (start, kind) in png_chunks(container) {
            if &kind != crate::format::PNG_TRAILER_CHUNK {
                continue;
            }
            let len = u32::from_be_bytes([
                container[start],
                container[start + 1],
                container[start + 2],
                container[start + 3],
            ]) as usize;
            let data_start = start + 8;
            let data_end = data_start + len;
            if data_end + 4 > container.len() {
                return Err(Error::Truncated);
            }
            let trailer = decode_trailer(&container[..data_end], data_start)?;
            let mut decoy = Vec::with_capacity(container.len() - len - 12);
            decoy.extend_from_slice(&container[..start]);
            decoy.extend_from_slice(&container[data_end + 4..]);
            return Ok((trailer, decoy));
        }
    }

    // 2. Plain tail append — the generic case, and what most third-party tools produce.
    if let Some(offset) = scan_tail_magic(container) {
        let trailer = decode_trailer(container, offset)?;
        return Ok((trailer, container[..offset].to_vec()));
    }

    Err(Error::NoContainer)
}

/// Last occurrence of the trailer magic, searching backwards from the end.
fn scan_tail_magic(bytes: &[u8]) -> Option<usize> {
    if bytes.len() < 8 {
        return None;
    }
    let needle = TRAILER_MAGIC;
    let last = bytes.len() - 8;
    let mut i = last as i64;
    while i >= 0 {
        if &bytes[i as usize..i as usize + 8] == needle {
            return Some(i as usize);
        }
        i -= 1;
    }
    None
}

// ---------------------------------------------------------------------------
// Forensic carving
// ---------------------------------------------------------------------------

/// A file signature found past the image's EOF marker.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CarveCandidate {
    /// Offset from the start of the container file.
    pub offset: usize,
    /// Short human label, e.g. `"ZIP"`.
    pub kind: &'static str,
    /// MIME type to save it as.
    pub mime: &'static str,
    /// `None` means "unknown length, carved to EOF".
    pub length: Option<usize>,
    /// A filename suggestion derived from the kind.
    pub suggested_name: String,
}

/// Signature table used by both implementations (`docs/STEGO_FORMAT.md` §5).
const SIGNATURES: &[(&[u8], &str, &str)] = &[
    (b"PK\x03\x04", "ZIP", "application/zip"),
    (b"PK\x05\x06", "ZIP", "application/zip"),
    (b"PK\x07\x08", "ZIP", "application/zip"),
    (b"%PDF-", "PDF", "application/pdf"),
    (&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A], "PNG", "image/png"),
    (&[0xFF, 0xD8, 0xFF], "JPEG", "image/jpeg"),
    (b"GIF8", "GIF", "image/gif"),
    (b"RIFF", "RIFF", "application/octet-stream"),
    (b"Rar!\x1A\x07", "RAR", "application/vnd.rar"),
    (&[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], "7Z", "application/x-7z-compressed"),
    (&[0x1F, 0x8B, 0x08], "GZIP", "application/gzip"),
    (b"BZh", "BZIP2", "application/x-bzip2"),
    (&[0xFD, b'7', b'z', b'X', b'Z', 0x00], "XZ", "application/x-xz"),
    (b"OggS", "OGG", "application/ogg"),
    (b"SQLite format 3\0", "SQLITE", "application/vnd.sqlite3"),
    (b"\x7FELF", "ELF", "application/x-elf"),
    (b"MZ", "EXE", "application/vnd.microsoft.portable-executable"),
    (b"ID3", "MP3", "audio/mpeg"),
];

/// Scan `container` for known file signatures that start at or after `search_from`.
///
/// This is the "no masc trailer, but something is clearly appended" path — it lets
/// the tool carve payloads out of files made by `cat a.jpg b.zip`, `zip -A`, ImageSteg,
/// OpenStego, and friends.
pub fn carve_candidates(container: &[u8], search_from: usize) -> Vec<CarveCandidate> {
    let start = search_from.min(container.len());
    let mut out: Vec<CarveCandidate> = Vec::new();

    // ZIP End-Of-Central-Directory lets us compute an exact length.
    for (sig, kind, mime) in SIGNATURES {
        let mut pos = start;
        while let Some(found) = find(&container[pos..], sig) {
            let offset = pos + found;
            let length = if *kind == "ZIP" {
                zip_length(container, offset)
            } else {
                None
            };
            if !out.iter().any(|c| c.offset == offset) {
                out.push(CarveCandidate {
                    offset,
                    kind,
                    mime,
                    length,
                    suggested_name: format!(
                        "carved_{:08x}.{}",
                        offset,
                        kind.to_lowercase()
                    ),
                });
            }
            pos = offset + 1;
            if pos >= container.len() {
                break;
            }
        }
    }

    // `ftyp` at offset 4 identifies MP4/MOV, and `ustar` at offset 257 identifies TAR.
    // These need the magic to sit at a *fixed* distance from the file's real start.
    out.extend(scan_tagged(container, start, b"ftyp", 4, "MP4", "video/mp4"));
    out.extend(scan_tagged(container, start, b"ustar", 257, "TAR", "application/x-tar"));

    // WEBP is a RIFF container whose form type appears at offset 8.
    let mut pos = start;
    while let Some(found) = find(&container[pos..], b"RIFF") {
        let offset = pos + found;
        if offset + 12 <= container.len() && &container[offset + 8..offset + 12] == b"WEBP" {
            out.push(CarveCandidate {
                offset,
                kind: "WEBP",
                mime: "image/webp",
                length: None,
                suggested_name: format!("carved_{:08x}.webp", offset),
            });
        }
        pos = offset + 1;
        if pos >= container.len() {
            break;
        }
    }

    out.sort_by_key(|c| c.offset);
    out.dedup_by_key(|c| c.offset);
    out
}

/// Find `tag` occurrences whose *file start* is `tag_offset` bytes before the tag.
///
/// A bare `ftyp` substring match would produce false positives from inside arbitrary
/// binary data, so only aligned hits are reported.
fn scan_tagged(
    container: &[u8],
    start: usize,
    tag: &[u8],
    tag_offset: usize,
    kind: &'static str,
    mime: &'static str,
) -> Vec<CarveCandidate> {
    let mut out = Vec::new();
    let mut pos = start;
    while let Some(found) = find(&container[pos..], tag) {
        let at = pos + found;
        if at >= tag_offset {
            out.push(CarveCandidate {
                offset: at - tag_offset,
                kind,
                mime,
                length: None,
                suggested_name: format!("carved_{:08x}.{}", at - tag_offset, kind.to_lowercase()),
            });
        }
        pos = at + 1;
        if pos >= container.len() {
            break;
        }
    }
    out
}

/// Exact byte length of a ZIP archive starting at `offset`, via the EOCD record.
fn zip_length(container: &[u8], offset: usize) -> Option<usize> {
    // EOCD is at most 22 bytes + 64 KiB of comment, so scan backwards from the end.
    let search_start = offset + 22;
    if container.len() > search_start {
        let hay = &container[search_start..];
        let mut i = hay.len().checked_sub(22)?;
        loop {
            if &hay[i..i + 4] == b"PK\x05\x06" {
                let comment_len = u16::from_le_bytes([hay[i + 20], hay[i + 21]]) as usize;
                let eocd_end = i + 22 + comment_len;
                if eocd_end <= hay.len() {
                    return Some(search_start + eocd_end - offset);
                }
                return None;
            }
            if i == 0 {
                return None;
            }
            i -= 1;
        }
    }
    None
}

/// Substring search with a first-byte prefilter.
///
/// The haystacks here are user files measured in megabytes, and `carve_candidates` runs
/// ~20 signatures over the whole file, so a plain `windows().position()` would be
/// needlessly quadratic. This is not cryptographic material, so a linear scan is fine.
fn find(hay: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || needle.len() > hay.len() {
        return None;
    }
    let first = needle[0];
    let last = hay.len() - needle.len();
    let mut i = 0usize;
    while i <= last {
        match hay[i..=last].iter().position(|&b| b == first) {
            Some(off) => {
                let at = i + off;
                if &hay[at..at + needle.len()] == needle {
                    return Some(at);
                }
                i = at + 1;
            }
            None => return None,
        }
    }
    None
}
