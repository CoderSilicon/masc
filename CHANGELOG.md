# Changelog

All notable changes to masc are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The container format is versioned independently from the application. See
[`docs/STEGO_FORMAT.md`](./docs/STEGO_FORMAT.md).

## [Unreleased]

### Added

- Architecture document covering the runtime, worker boundary, and backend parity.
- Security policy, contribution process, code of conduct, and project license.
- Issue and pull-request templates.

### Changed

- Adopted the **PolyForm Strict License 1.0.0**: noncommercial use only, with no
  modification, distribution, or ownership claims.
- Redesigned the README around the two hiding methods, quick start, capacity, and
  security limitations.

## [1.0.0] — 2026-11-01

### Added

- **Method A — LSB embedding** into RGBA colour channels, with a 20-byte header
  (`STEGLSB1`), version and flags, payload length, and CRC-32 integrity check.
- One-plane and two-plane embedding modes.
- Carrier resynchronisation for payloads written at a non-zero pixel offset.
- Alpha-aware carrier selection: semi-transparent pixels are skipped.
- Zero-fill of unused carrier slots.
- **Method B — trailing-file container** with the `STEGAPP1` trailer, original filename,
  MIME type, and raw payload.
- PNG support through a private ancillary `stEg` chunk inserted before `IEND`, keeping
  the output spec-valid.
- Tail append for JPEG, GIF, WebP, BMP, and other decoy formats.
- Byte-for-byte restoration of the original decoy after extraction.
- Forensic signature carving for ZIP, PDF, PNG, JPEG, GIF, RIFF, WebP, RAR, 7z, GZIP,
  BZIP2, XZ, MP4/MOV, OGG, SQLite, and TAR data.
- **Optional encryption:** PBKDF2-HMAC-SHA256 (210,000 rounds) and AES-256-GCM with a
  random 32-byte salt, random 12-byte IV, and `masc-steg-v1` AAD.
- Rust core compiled to WebAssembly with `wasm-bindgen`.
- Byte-compatible TypeScript fallback core for browsers without the WASM module.
- Dedicated Web Worker for pixel-heavy work, with a typed RPC client.
- SvelteKit workbench with picture and file modes, password handling, clipboard copy,
  downloads, and a live capacity calculator.
- Node golden-vector tests for the TypeScript core.
- Rust unit and integration tests for the core, including corruption, resync, PNG chunk,
  trailer, and filename-sanitisation cases.
- WASM build workflow.
- Normative container specification in `docs/STEGO_FORMAT.md`.
- `steg-core` crate documentation and WASM API reference.

### Security

- Payload confidentiality is opt-in; the project documents that hiding is not encryption.
- Salt and IV generation use a platform CSPRNG, never `Math.random()`.
- Extracted filenames are stripped of path components to prevent path traversal.
- Malformed lengths, offsets, and truncated input are rejected with typed errors.
- The UI enforces a 40-megapixel guard rail before decoding large images.

### Documentation

- Initial README, crate README, and container format specification.

---

## Version links

- [Unreleased](https://github.com/CoderSilicon/masc/compare/v1.0.0...HEAD)
- [1.0.0](https://github.com/CoderSilicon/masc/releases/tag/v1.0.0)

© 2026 CoderSilicon. All rights reserved.
