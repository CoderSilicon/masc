//! Native unit tests. Run with `cargo test -p steg-core` (no WASM toolchain needed).
//!
//! These are the reference the TypeScript mirror in `src/lib/steg/core.ts` is checked
//! against — the golden vectors below pin the exact byte layout.

use crate::append::*;
use crate::format::*;
use crate::lsb::*;
use crate::Error;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// A deterministic RGBA test image with fully opaque pixels.
fn make_rgba(w: usize, h: usize, seed: u8) -> Vec<u8> {
    let mut v = Vec::with_capacity(w * h * 4);
    for i in 0..(w * h) {
        v.push((i as u8).wrapping_mul(7).wrapping_add(seed));
        v.push((i as u8).wrapping_mul(31).wrapping_add(seed ^ 0x5A));
        v.push((i as u8).wrapping_mul(97).wrapping_add(seed ^ 0xA5));
        v.push(0xFF);
    }
    v
}

fn cfg() -> LsbConfig {
    LsbConfig::default()
}

// ---------------------------------------------------------------------------
// Method A
// ---------------------------------------------------------------------------

#[test]
fn lsb_round_trip_text() {
    let (w, h) = (64, 64);
    let mut rgba = make_rgba(w, h, 0x11);
    let secret = b"Meet me at 0300. Bring the falcon.";

    let report = embed(&mut rgba, w, h, secret, false, &cfg()).unwrap();
    assert!(report.bits_written > 0);
    assert!(report.bits_written <= report.bits_capacity);

    let out = extract(&rgba, w, h, &cfg()).unwrap();
    assert_eq!(out.payload, secret);
    assert_eq!(out.carrier_offset, 0);
    assert!(!out.flags.encrypted);
}

#[test]
fn lsb_only_touches_one_bit() {
    let (w, h) = (32, 32);
    let original = make_rgba(w, h, 0x22);
    let mut rgba = original.clone();
    embed(&mut rgba, w, h, b"x", false, &cfg()).unwrap();

    let mut changed_channels = 0;
    for i in 0..rgba.len() {
        if rgba[i] == original[i] {
            continue;
        }
        // Every difference must be confined to the low bit of an RGB channel.
        assert_eq!(rgba[i] ^ original[i], 1, "byte {i} changed by more than the LSB");
        assert_ne!(i % 4, 3, "alpha channel {i} was modified");
        changed_channels += 1;
    }
    assert!(changed_channels > 0);
}

#[test]
fn lsb_skips_transparent_pixels() {
    let (w, h) = (8, 8);
    let mut rgba = make_rgba(w, h, 0x33);
    // Make every other pixel fully transparent.
    for p in (0..(w * h)).step_by(2) {
        rgba[p * 4 + 3] = 0x00;
    }
    let opaque = carrier_count(&rgba, w, h, &cfg());
    assert_eq!(opaque, (w * h) / 2);

    let secret = b"only opaque pixels carry me";
    embed(&mut rgba, w, h, secret, false, &cfg()).unwrap();
    let out = extract(&rgba, w, h, &cfg()).unwrap();
    assert_eq!(out.payload, secret);
}

#[test]
fn lsb_two_planes_round_trip() {
    let (w, h) = (64, 64);
    let mut rgba = make_rgba(w, h, 0x44);
    let c = LsbConfig { planes: 2, ..cfg() };
    let secret = vec![0xABu8; 200];
    embed(&mut rgba, w, h, &secret, false, &c).unwrap();
    // A two-plane container needs the two-plane slot order; the header's `two_planes`
    // flag is what tells a decoder to try it.
    let out = extract(&rgba, w, h, &c).unwrap();
    assert_eq!(out.payload, secret);
    assert!(out.flags.two_planes);
}

#[test]
fn lsb_one_plane_container_is_not_misread_as_two_plane() {
    let (w, h) = (32, 32);
    let mut rgba = make_rgba(w, h, 0x45);
    embed(&mut rgba, w, h, b"one plane only", false, &cfg()).unwrap();

    // Reading with the wrong slot order must fail loudly, not return garbage.
    let two = LsbConfig { planes: 2, ..cfg() };
    let err = extract(&rgba, w, h, &two).unwrap_err();
    assert!(
        matches!(err, Error::NoContainer | Error::ChecksumMismatch { .. }),
        "expected a failure, got {err:?}"
    );
}

#[test]
fn lsb_capacity_is_enforced() {
    let (w, h) = (4, 4);
    let mut rgba = make_rgba(w, h, 0x55);
    let huge = vec![0u8; 10_000];
    let err = embed(&mut rgba, w, h, &huge, false, &cfg()).unwrap_err();
    match err {
        Error::CapacityExceeded { needed, available } => {
            assert_eq!(available, 16 * 3); // 16 pixels x 3 slots
            assert!(needed > available);
        }
        other => panic!("expected CapacityExceeded, got {other:?}"),
    }
}

#[test]
fn lsb_detects_corruption() {
    let (w, h) = (32, 32);
    let mut rgba = make_rgba(w, h, 0x66);
    embed(&mut rgba, w, h, b"do not recompress me", false, &cfg()).unwrap();

    // Simulate what a JPEG round trip (or a social platform) does to the low bits.
    for i in (0..rgba.len()).step_by(4) {
        rgba[i] = rgba[i].wrapping_add(3);
    }
    let err = extract(&rgba, w, h, &cfg()).unwrap_err();
    assert!(
        matches!(err, Error::ChecksumMismatch { .. } | Error::NoContainer),
        "expected a corruption error, got {err:?}"
    );
}

#[test]
fn lsb_clean_image_reports_no_container() {
    let (w, h) = (32, 32);
    let rgba = make_rgba(w, h, 0x77);
    assert_eq!(extract(&rgba, w, h, &cfg()).unwrap_err(), Error::NoContainer);
}

#[test]
fn lsb_resyncs_to_a_non_zero_carrier_offset() {
    // A payload written at carrier 0, then every pixel shifted right by 3.
    //
    // A single row is used deliberately: the slot order is per-pixel, but the carrier
    // sequence is a flat raster scan. A shift that crossed a row boundary would relocate
    // the first three carriers of the next row somewhere the shift does not describe,
    // silently corrupting the payload. One row keeps the shift equivalent to a carrier
    // shift, which is exactly the situation the resync scan is meant to recover from.
    let h = 1usize;
    let w = 1024usize;
    let w2 = w + 3;
    let secret = b"offset payload";

    let mut wide = make_rgba(w2, h, 0x88);
    embed(&mut wide, w2, h, secret, false, &cfg()).unwrap();

    // new(p) = old(p - 3) for p >= 3; the first three pixels become filler.
    let mut shifted = make_rgba(w2, h, 0x99);
    shifted[3 * 4..(3 + w) * 4].copy_from_slice(&wide[..w * 4]);

    let out = extract(&shifted, w2, h, &cfg()).unwrap();
    assert_eq!(out.payload, secret);
    assert_eq!(out.carrier_offset, 3);
}

// ---------------------------------------------------------------------------
// Method B
// ---------------------------------------------------------------------------

/// Minimal but valid PNG: signature + IHDR + IEND.
fn tiny_png() -> Vec<u8> {
    let ihdr_data = [0u8; 13];
    let mut png = Vec::new();
    png.extend_from_slice(&PNG_SIGNATURE);
    png.extend_from_slice(&png_chunk(b"IHDR", &ihdr_data));
    png.extend_from_slice(&png_chunk(b"IEND", &[]));
    png
}

#[test]
fn png_trailer_goes_into_an_ancillary_chunk() {
    let decoy = tiny_png();
    let payload = b"the hidden file bytes".to_vec();
    let trailer = build_trailer("notes.pdf", "application/pdf", &payload).unwrap();
    let stego = attach_trailer(&decoy, &trailer).unwrap();

    // Still a valid PNG: the chunk walk must terminate cleanly on IEND.
    assert!(is_png(&stego));
    let chunks = png_chunks(&stego);
    assert_eq!(chunks.last().unwrap().1, *b"IEND");
    assert!(chunks.iter().any(|(_, k)| k == PNG_TRAILER_CHUNK));
    // IEND must remain the final chunk, per the PNG spec.
    assert!(stego.len() > decoy.len());

    let (got, recovered) = detach_trailer(&stego).unwrap();
    assert_eq!(got.name, "notes.pdf");
    assert_eq!(got.mime, "application/pdf");
    assert_eq!(got.payload, payload);
    assert_eq!(recovered, decoy, "decoy must be restored byte-for-byte");
}

#[test]
fn non_png_trailer_is_appended_after_the_eof_marker() {
    // A JPEG-ish blob ending in the EOI marker.
    let mut decoy = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
    decoy.extend_from_slice(&[0u8; 32]);
    decoy.extend_from_slice(&[0xFF, 0xD9]);

    let payload = b"PK\x03\x04 pretend zip".to_vec();
    let trailer = build_trailer("secret.zip", "application/zip", &payload).unwrap();
    let stego = attach_trailer(&decoy, &trailer).unwrap();

    // The decoy is untouched and still ends in EOI before the trailer.
    assert_eq!(&stego[..decoy.len()], &decoy[..]);
    assert_eq!(&stego[decoy.len()..decoy.len() + 8], TRAILER_MAGIC);

    let (got, recovered) = detach_trailer(&stego).unwrap();
    assert_eq!(got.payload, payload);
    assert_eq!(recovered, decoy);
}

#[test]
fn trailer_filename_cannot_escape_a_directory() {
    let t = decode_trailer(
        &build_trailer("../../../../etc/passwd", "text/plain", b"x").unwrap(),
        0,
    )
    .unwrap();
    assert_eq!(t.name, "passwd");
}

#[test]
fn clean_file_has_no_trailer() {
    assert_eq!(detach_trailer(&tiny_png()).unwrap_err(), Error::NoContainer);
}

#[test]
fn carve_finds_a_zip_appended_by_cat() {
    let mut png = tiny_png();
    // A minimal but structurally recognisable ZIP: local header + EOCD.
    png.extend_from_slice(b"PK\x03\x04");
    png.extend_from_slice(&[0u8; 60]);
    png.extend_from_slice(b"PK\x05\x06");
    png.extend_from_slice(&[0u8; 18]);

    let eof = png_iend_offset(&png).unwrap();
    let found = carve_candidates(&png, eof);
    assert!(found.iter().any(|c| c.kind == "ZIP"), "expected a ZIP candidate, got {found:?}");
    // The first match is the local file header; the EOCD also matches.
    assert_eq!(found[0].offset, eof);
    assert_eq!(found[0].length, Some(86));
}

#[test]
fn png_chunk_walker_terminates_on_garbage() {
    let mut bytes = PNG_SIGNATURE.to_vec();
    bytes.extend_from_slice(&[0xFF, 0xFF, 0xFF, 0x7F]); // absurd chunk length
    bytes.extend_from_slice(b"IHDR");
    bytes.extend_from_slice(&[0u8; 16]);
    assert!(png_iend_offset(&bytes).is_none());
    assert!(png_chunks(&bytes).len() <= 1);
}

// ---------------------------------------------------------------------------
// Golden vectors — these pin the on-disk layout shared with the TS implementation
// ---------------------------------------------------------------------------

#[test]
fn golden_lsb_header_bytes() {
    let blob = pack_lsb_header(Flags { encrypted: false, two_planes: true }, b"hi");
    assert_eq!(&blob[0..8], b"STEGLSB1");
    assert_eq!(blob[8], 1, "version");
    assert_eq!(blob[9], 0b0000_0010, "two-planes flag only");
    assert_eq!(&blob[10..12], &[0, 0], "reserved");
    assert_eq!(&blob[12..16], &[2, 0, 0, 0], "payload_len u32 LE");
    // CRC-32/ISO-HDLC of "hi" is 0xD8932AAC, stored little-endian.
    assert_eq!(&blob[16..20], &[0xAC, 0x2A, 0x93, 0xD8]);
    assert_eq!(blob.len(), LSB_HEADER_LEN);
}

#[test]
fn golden_trailer_bytes() {
    let t = build_trailer("a.txt", "text/plain", b"xy").unwrap();
    assert_eq!(&t[0..8], b"STEGAPP1");
    assert_eq!(&t[8..10], &[5, 0], "name_len");
    assert_eq!(&t[10..12], &[10, 0], "mime_len");
    assert_eq!(&t[12..14], &[0, 0], "reserved");
    assert_eq!(&t[14..18], &[2, 0, 0, 0], "payload_len");
    assert_eq!(&t[18..23], b"a.txt");
    assert_eq!(&t[23..33], b"text/plain");
    assert_eq!(&t[33..], b"xy");
}

#[test]
fn golden_png_chunk_is_big_endian() {
    // Both the chunk length and the chunk CRC are big-endian on the wire. Writing them
    // little-endian still round-trips through our own parser (which trusts the declared
    // length) but produces a chunk every real PNG validator rejects.
    let chunk = png_chunk(b"IEND", &[]);
    assert_eq!(chunk.len(), 12);
    assert_eq!(&chunk[0..4], &[0, 0, 0, 0], "zero-length data");
    assert_eq!(&chunk[4..8], b"IEND");
    // CRC-32/ISO-HDLC of the bytes "IEND" is 0xAE426082.
    assert_eq!(&chunk[8..12], &[0xAE, 0x42, 0x60, 0x82]);
}

#[test]
fn crc32_matches_known_vector() {
    // The standard CRC-32/ISO-HDLC check value for "123456789".
    assert_eq!(crc32fast::hash(b"123456789"), 0xCBF43926);
}

#[test]
fn envelope_header_is_sixty_bytes() {
    let mut rng = crate::crypto::FixedRng(0x5A);
    let sealed = crate::crypto::seal(b"payload", b"pw", 1000, &mut rng).unwrap();
    assert_eq!(&sealed[0..8], ENVELOPE_MAGIC);
    assert_eq!(&sealed[8..10], &1000u16.to_le_bytes());
    assert_eq!(sealed[10] as usize, 32, "salt_len");
    assert_eq!(sealed[43] as usize, 12, "iv_len");

    // 60-byte fixed header + ciphertext + 16-byte GCM tag.
    let ct_len_at = 56;
    let ct_len = u32::from_le_bytes([
        sealed[ct_len_at],
        sealed[ct_len_at + 1],
        sealed[ct_len_at + 2],
        sealed[ct_len_at + 3],
    ]) as usize;
    assert_eq!(ct_len, b"payload".len() + 16, "tag is appended to the ciphertext");
    assert_eq!(sealed.len(), 60 + ct_len);
}
