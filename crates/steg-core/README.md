# steg-core

The canonical masc steganography engine, written in Rust and compiled to
WebAssembly for the browser.

It implements the two container formats specified in [`../../docs/STEGO_FORMAT.md`](../../docs/STEGO_FORMAT.md):

* **Method A** — LSB bit embedding into the low bits of RGBA channel data, with a magic
  prefix, a length prefix, a CRC-32 integrity check and pixel-aligned resynchronisation.
* **Method B** — appending a second file to a decoy. PNG decoys get a private ancillary
  chunk (so the output stays spec-valid); everything else gets a plain tail append, plus
  a forensic carver that recognises third-party hiding tools.

A byte-for-byte TypeScript mirror lives in [`../../src/lib/steg/core.ts`](../../src/lib/steg/core.ts).
The two must stay in sync; the golden vectors in `tests/format.rs` pin the layout.

## Build the WASM module

You need [`wasm-pack`](https://rustwasm.github.io/wasm-pack/installer/):

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

Then, from the repository root:

```bash
npm run build:wasm
```

which runs:

```bash
wasm-pack build crates/steg-core --target web --out-dir ../../static/wasm --release
```

The generated `static/wasm/` directory is git-ignored. The app looks for it at runtime and
falls back to the TypeScript engine when it is absent, so the build is optional but
recommended for large images.

## Test without a WASM toolchain

All the format logic is plain Rust with no JS dependency, so the native test suite runs
anywhere you have a Rust toolchain:

```bash
cargo test -p steg-core
```

`cargo test` covers the LSB round trip, the one-bit-only guarantee, alpha skipping,
two-plane mode, capacity enforcement, corruption detection, carrier-offset resync, PNG
chunk insertion/removal, tail append, path-traversal stripping in filenames, signature
carving, and the exact golden byte vectors.

## WASM API

| Export | Purpose |
| --- | --- |
| `lsb_capacity_bits(rgba, w, h, planes)` | Bits the image can hold |
| `lsb_carrier_count(rgba, w, h)` | Fully opaque carrier pixels |
| `lsb_embed(rgba, w, h, payload, encrypted, planes)` | Embed (mutates `rgba` in place) |
| `lsb_extract(rgba, w, h)` | Extract the LSB payload |
| `seal(plaintext, passphrase)` | PBKDF2 + AES-256-GCM envelope |
| `unseal(envelope, passphrase)` | Open an envelope |
| `is_envelope(bytes)` | Cheap `STGECRY1` check |
| `attach(decoy, name, mime, payload)` | Method B: build + attach trailer |
| `detach(container)` | Method B: recover payload and original decoy |
| `carve(container, searchFrom)` | Forensic signature carving |
| `image_eof_offset(bytes)` | First offset available for hidden data |
| `version()` | Core/container/KDF versions, for parity checks |

## Security notes

* **Steganography is not encryption.** Without a passphrase, anyone running the decoder
  reads the payload. The passphrase layer is opt-in and uses PBKDF2-HMAC-SHA256
  (210 000 rounds) with AES-256-GCM and a random salt/IV per seal.
* **Method A requires PNG.** JPEG's DCT transform re-quantises chroma and destroys the low
  bit. Any platform that re-encodes an image (X, Discord, Instagram, most "optimise"
  pipelines) will silently strip the payload.
* Semi-transparent pixels are never used as carriers, because browsers premultiply alpha
  during canvas compositing and the RGB of such a pixel is not round-trip stable.
* Randomness comes from the browser CSPRNG (`crypto.getRandomValues`). Never substitute
  `Math.random()`.
