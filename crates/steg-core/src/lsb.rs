//! Method A — Least Significant Bit embedding into raw RGBA pixels.
//!
//! The image arrives here already decoded to a flat `RGBA` byte array (the browser does
//! that via `createImageBitmap` + `OffscreenCanvas`, or the Rust host via any decoder).
//! Working on raw RGBA keeps this module free of image-codec dependencies and makes the
//! bit maths easy to audit.
//!
//! No `unsafe` in this file: the carrier walk is generic over the buffer's ownership
//! (shared for decode, mutable for encode) rather than transmuting pointers.

use crate::format::{pack_lsb_header, unpack_lsb_header, Flags, LSB_MAGIC, VERSION};
use crate::{Error, Result};
use std::ops::Deref;

/// Errors specific to the LSB codec.
pub type LsbError = Error;

/// Knobs that affect how the bitstream is laid out. Both sides must agree exactly.
#[derive(Debug, Clone, Copy)]
pub struct LsbConfig {
    /// Number of low bits per channel to use. `1` is the default; `2` roughly doubles
    /// capacity at the cost of a more visible "banding" artefact in smooth gradients.
    pub planes: u8,
    /// Skip pixels whose alpha is not `0xFF`.
    ///
    /// This must stay `true` for any image that is not fully opaque. The browser
    /// premultiplies alpha when it composites onto a canvas, so the RGB of a
    /// semi-transparent pixel is not round-trip stable and the payload would rot.
    pub skip_transparent: bool,
    /// How many carrier pixels to advance while resynchronising on the magic.
    pub max_scan: usize,
}

impl Default for LsbConfig {
    fn default() -> Self {
        LsbConfig { planes: 1, skip_transparent: true, max_scan: 65_536 }
    }
}

impl LsbConfig {
    pub fn slots_per_carrier(&self) -> usize {
        3 * self.planes.clamp(1, 2) as usize
    }
}

/// What `embed` did, so the UI can report capacity utilisation.
#[derive(Debug, Clone, Copy)]
pub struct EmbedReport {
    /// Bits written (header + payload). The remainder of the carrier space is zero-filled.
    pub bits_written: usize,
    /// Total bits the image could hold.
    pub bits_capacity: usize,
    pub carriers: usize,
}

/// What `extract` found.
#[derive(Debug, Clone)]
pub struct ExtractReport {
    pub payload: Vec<u8>,
    /// Carrier index the container started at. `0` for a normal encode.
    pub carrier_offset: usize,
    pub flags: Flags,
}

// ---------------------------------------------------------------------------
// The carrier stream: which bit of which byte holds the n-th data bit
// ---------------------------------------------------------------------------

/// Walks the LSB slots of a carrier image in raster order without allocating.
///
/// For each pixel it yields `(byte_index, bit_index)` pairs. See `docs/STEGO_FORMAT.md`
/// §1.1 — that ordering is the contract between encoder and decoder.
struct CarrierStream<D> {
    data: D,
    pixels: usize,
    planes: u8,
    skip_transparent: bool,
    slots: usize,
    pixel: usize,
    step: usize,
}

impl<D: Deref<Target = [u8]>> CarrierStream<D> {
    fn new(data: D, width: usize, height: usize, cfg: &LsbConfig) -> Self {
        CarrierStream {
            data,
            pixels: width.saturating_mul(height),
            planes: cfg.planes.clamp(1, 2),
            skip_transparent: cfg.skip_transparent,
            slots: cfg.slots_per_carrier(),
            pixel: 0,
            step: 0,
        }
    }

    /// Number of carrier pixels. O(n), no allocation.
    fn count(&self) -> usize {
        if !self.skip_transparent {
            return self.pixels;
        }
        (0..self.pixels).filter(|&p| self.data[p * 4 + 3] == 0xFF).count()
    }

    #[inline]
    fn is_carrier(&self, p: usize) -> bool {
        !self.skip_transparent || self.data[p * 4 + 3] == 0xFF
    }

    /// Next slot as `(byte_index, bit_index)`, or `None` when the image is exhausted.
    ///
    /// Slot order within a pixel is `R.0, G.0, B.0, R.1, G.1, B.1, …` — plane-major, so
    /// a 2-plane image still uses neighbouring bits of the same channel.
    #[inline]
    fn next_slot(&mut self) -> Option<(usize, u8)> {
        while self.pixel < self.pixels {
            let p = self.pixel;
            if !self.is_carrier(p) {
                self.pixel += 1;
                self.step = 0;
                continue;
            }
            let plane = (self.step / 3) as u8;
            let channel = self.step % 3;
            self.step += 1;
            if self.step == self.slots {
                self.step = 0;
                self.pixel += 1;
            }
            if plane < 8 {
                // R, G, B live at byte offsets 0, 1, 2 of the pixel's 4 bytes; the 4th
                // is alpha and is never touched.
                return Some((p * 4 + channel, plane));
            }
        }
        None
    }

    /// Position bookmark used to probe the magic without consuming slots.
    fn checkpoint(&self) -> (usize, usize) {
        (self.pixel, self.step)
    }

    fn restore(&mut self, at: (usize, usize)) {
        self.pixel = at.0;
        self.step = at.1;
    }

    /// Move the cursor to the first slot of the *next* carrier pixel.
    ///
    /// Assumes the cursor is parked at a carrier start — which is where a
    /// non-destructive probe leaves it — so it always skips at least one pixel, even
    /// when `step` is zero.
    fn advance_one_carrier(&mut self) -> bool {
        self.pixel += 1;
        self.step = 0;
        while self.pixel < self.pixels {
            if self.is_carrier(self.pixel) {
                return true;
            }
            self.pixel += 1;
        }
        false
    }
}

// ---------------------------------------------------------------------------
// Bit plumbing
// ---------------------------------------------------------------------------

/// Writes bytes MSB-first into a carrier stream.
struct BitWriter<'a, D: Deref<Target = [u8]> + DerefMut> {
    stream: &'a mut CarrierStream<D>,
    written: usize,
}

impl<'a, D: Deref<Target = [u8]> + DerefMut> BitWriter<'a, D> {
    fn new(stream: &'a mut CarrierStream<D>) -> Self {
        BitWriter { stream, written: 0 }
    }

    /// Overwrite a single bit. `bit` must be 0 or 1.
    #[inline]
    fn put_bit(&mut self, bit: u8) {
        if let Some((idx, plane)) = self.stream.next_slot() {
            let mask = 1u8 << plane;
            let byte: &mut u8 = &mut self.stream.data[idx];
            *byte = (*byte & !mask) | ((bit & 1) << plane);
        }
        self.written += 1;
    }

    /// One payload byte = 8 slots, MSB first.
    fn put_byte(&mut self, byte: u8) {
        for i in (0..8).rev() {
            self.put_bit((byte >> i) & 1);
        }
    }

    /// Zero-fill every remaining slot. Keeps the tail deterministic and stops the
    /// original image's low bits from leaking past the payload.
    fn zero_fill(&mut self) {
        while self.stream.next_slot().is_some() {
            self.put_bit(0);
        }
    }
}

/// Reads bytes MSB-first out of a carrier stream.
struct BitReader<'a, D: Deref<Target = [u8]>> {
    stream: &'a mut CarrierStream<D>,
}

impl<'a, D: Deref<Target = [u8]>> BitReader<'a, D> {
    fn new(stream: &'a mut CarrierStream<D>) -> Self {
        BitReader { stream }
    }

    #[inline]
    fn get_bit(&mut self) -> Option<u8> {
        let (idx, plane) = self.stream.next_slot()?;
        Some((self.stream.data[idx] >> plane) & 1)
    }

    fn get_byte(&mut self) -> Option<u8> {
        let mut b = 0u8;
        for _ in 0..8 {
            b = (b << 1) | self.get_bit()?;
        }
        Some(b)
    }

    fn get_bytes(&mut self, len: usize) -> Option<Vec<u8>> {
        // Cap the pre-allocation so a hostile length cannot make us reserve gigabytes.
        let mut out = Vec::with_capacity(len.min(1 << 20));
        for _ in 0..len {
            out.push(self.get_byte()?);
        }
        Some(out)
    }

    /// Read `len` bytes without advancing the stream.
    ///
    /// Used to probe the magic. This reads *bytes*: an earlier revision compared eight
    /// individual stream bits against the eight magic bytes, which can never match,
    /// because the magic occupies 64 bits of the stream.
    fn peek_bytes(&mut self, len: usize) -> Option<Vec<u8>> {
        let at = self.stream.checkpoint();
        let bytes = self.get_bytes(len);
        self.stream.restore(at);
        bytes
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Bits the given image can hold. Mirrors the TypeScript `capacityBits`.
pub fn capacity_bits(rgba: &[u8], width: usize, height: usize, cfg: &LsbConfig) -> usize {
    CarrierStream::new(rgba, width, height, cfg).count() * cfg.slots_per_carrier()
}

/// Number of carrier pixels (only fully opaque ones when `skip_transparent`).
pub fn carrier_count(rgba: &[u8], width: usize, height: usize, cfg: &LsbConfig) -> usize {
    CarrierStream::new(rgba, width, height, cfg).count()
}

/// Sanity check used by both implementations to validate image dimensions.
pub fn check_dimensions(rgba_len: usize, width: usize, height: usize) -> Result<()> {
    match width.checked_mul(height).and_then(|v| v.checked_mul(4)) {
        Some(n) if n == rgba_len => Ok(()),
        Some(n) => Err(Error::Malformed(format!(
            "expected {n} RGBA bytes for {width}x{height}, got {rgba_len}"
        ))),
        None => Err(Error::Malformed("image dimensions overflow".into())),
    }
}

/// Embed `payload` into the LSBs of `rgba`, which is mutated in place.
///
/// `encrypted` only records in the header that the payload is an encrypted envelope; the
/// sealing itself is done by [`crate::crypto::seal`] before calling this.
pub fn embed(
    rgba: &mut [u8],
    width: usize,
    height: usize,
    payload: &[u8],
    encrypted: bool,
    cfg: &LsbConfig,
) -> Result<EmbedReport> {
    check_dimensions(rgba.len(), width, height)?;

    let flags = Flags { encrypted, two_planes: cfg.planes == 2 };
    let blob = pack_lsb_header(flags, payload);
    let total_bits = blob.len() * 8;

    let mut probe = CarrierStream::new(&*rgba, width, height, cfg);
    let carriers = probe.count();
    let capacity = carriers * cfg.slots_per_carrier();
    if total_bits > capacity {
        return Err(Error::CapacityExceeded { needed: total_bits, available: capacity });
    }
    drop(probe);

    let mut stream = CarrierStream::new(rgba, width, height, cfg);
    let mut writer = BitWriter::new(&mut stream);
    for &b in &blob {
        writer.put_byte(b);
    }
    writer.zero_fill();

    Ok(EmbedReport { bits_written: total_bits, bits_capacity: capacity, carriers })
}

/// Extract the LSB payload, if any, from `rgba`.
///
/// Scans pixel-aligned offsets for the magic so a payload written at a non-zero carrier
/// offset is still recoverable.
pub fn extract(
    rgba: &[u8],
    width: usize,
    height: usize,
    cfg: &LsbConfig,
) -> Result<ExtractReport> {
    check_dimensions(rgba.len(), width, height)?;

    let scan = cfg.max_scan.max(1);
    let mut stream = CarrierStream::new(rgba, width, height, cfg);

    for carrier_offset in 0..scan {
        if carrier_offset > 0 && !stream.advance_one_carrier() {
            break;
        }

        // --- Probe the 8-byte magic without consuming any slots. ---
        let magic_found = {
            let probe = BitReader::new(&mut stream);
            matches!(probe.peek_bytes(8).as_deref(), Some(m) if m == LSB_MAGIC)
        };
        if !magic_found {
            continue;
        }

        let mut reader = BitReader::new(&mut stream);
        let _magic = reader.get_bytes(8).ok_or(Error::Truncated)?;
        let version = reader.get_byte().ok_or(Error::Truncated)?;
        if version != VERSION {
            return Err(Error::Malformed(format!("unsupported container version {version}")));
        }
        let flags = Flags::from_byte(reader.get_byte().ok_or(Error::Truncated)?);
        let _reserved = reader.get_bytes(2).ok_or(Error::Truncated)?;
        let len_raw = reader.get_bytes(4).ok_or(Error::Truncated)?;
        let payload_len = u32::from_le_bytes([len_raw[0], len_raw[1], len_raw[2], len_raw[3]]) as usize;
        let crc_raw = reader.get_bytes(4).ok_or(Error::Truncated)?;
        let expected_crc = u32::from_le_bytes([crc_raw[0], crc_raw[1], crc_raw[2], crc_raw[3]]);

        // 1 GiB is far beyond any plausible text message and stops a corrupted length
        // field from triggering a giant allocation.
        if payload_len == 0 || payload_len > (1 << 30) {
            return Err(Error::Malformed(format!("implausible payload length {payload_len}")));
        }

        let payload = reader.get_bytes(payload_len).ok_or(Error::Truncated)?;

        let actual_crc = crc32fast::hash(&payload);
        if actual_crc != expected_crc {
            return Err(Error::ChecksumMismatch { expected: expected_crc, actual: actual_crc });
        }

        return Ok(ExtractReport { payload, carrier_offset, flags });
    }

    Err(Error::NoContainer)
}

/// Parse a header out of an already-serialised blob. Exposed for tests.
pub fn parse_header(blob: &[u8]) -> Result<crate::format::LsbHeader> {
    unpack_lsb_header(blob)
}
