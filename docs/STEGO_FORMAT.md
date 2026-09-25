# masc Stego Format — v1

This document is the **normative** specification of the two container formats used by
masc. It is the contract shared by the two implementations in this repo:

| Implementation | Path | Runtime |
| --- | --- | --- |
| Rust core (canonical) | `crates/steg-core` | WASM via `wasm-bindgen` |
| TypeScript mirror | `src/lib/steg/core.ts` | Web Worker (fallback / reference) |

Both implementations MUST produce and consume byte-identical containers. Any change here
must be applied to both.

---

## 0. Conventions

* Integers are **little-endian** unless the field says otherwise.
* Bit streams are written **MSB-first**: the first bit of a byte is bit 7.
* Offsets and lengths in bytes unless stated otherwise.

---

## 1. LSB Text Container (Method A)

### 1.1 Carrier selection

The encoder and decoder must agree on *which bytes carry data* without transmitting that
information. Rule, applied identically by both:

1. Walk pixels in **raster order**: `for y in 0..height { for x in 0..width { p = y*width + x } }`.
2. A pixel is a **carrier** iff its alpha channel is `0xFF` (fully opaque).
   Semi-transparent pixels are skipped on purpose: browsers premultiply alpha during
   canvas compositing, which silently corrupts the RGB of non-opaque pixels.
3. For a carrier pixel, the bit slots are enumerated as:

   ```
   for plane in 0..planes:      # planes is 1 or 2
       for c in 0..3:           # c is the channel index: 0=R, 1=G, 2=B
           slot = rgba[p*4 + c] bit `plane`
   ```

   So `planes == 1` gives 3 slots/pixel, `planes == 2` gives 6 slots/pixel.

Capacity is `carriers * 3 * planes` bits.

### 1.2 Header

| Offset | Size | Field | Notes |
| --- | --- | --- | --- |
| 0 | 8 | `magic` | ASCII `STEGLSB1` |
| 8 | 1 | `version` | `1` |
| 9 | 1 | `flags` | bit0 = payload is an encrypted envelope (§2), bit1 = `planes == 2`. Other bits reserved, MUST be 0. |
| 10 | 2 | `reserved` | MUST be 0 |
| 12 | 4 | `payload_len` | u32 LE, byte length of the payload |
| 16 | 4 | `payload_crc32` | u32 LE, CRC-32/ISO-HDLC of the payload |

Header size is **20 bytes**. Total bit length is `(20 + payload_len) * 8`.

### 1.3 Encoding

1. Build the header, append the payload, and serialise the whole thing MSB-first into the
   carrier slot stream described in §1.1.
2. **Zero-fill** the remaining carrier slots. This is important: it keeps a second
   embedding on the same carrier deterministic, and it stops the tail of the stream from
   leaking whatever the original image happened to contain.
3. Re-encode the carrier image as **PNG** (lossless). See §4.

### 1.4 Decoding

1. Start at carrier `0`. Read the 8-byte magic. If it matches, decode the header and
   payload from carrier `0`.
2. Otherwise **resync**: advance one carrier at a time (pixel-aligned) and retry, up to
   `max_scan` carriers (default 65 536). This lets the extractor recover a payload that was
   written with a non-zero carrier offset.
3. Validate `version == 1` and that `payload_crc32` matches. A mismatch means the carrier
   has been re-compressed or otherwise damaged — report corruption, do not return garbage.

### 1.5 Trailer (delimiter)

The requirement asks for "a clear delimiter/sentinel (or length prefix)". This format uses
**both**, and the length prefix is authoritative:

* the length prefix `payload_len` terminates the message, and
* the magic + CRC-32 give the decoder a way to *find and validate* the start of the
  message before trusting the length.

---

## 2. Encrypted Envelope

Used when the user supplies a passphrase. The envelope is what gets stored as the LSB
payload, or as the payload of a §3 trailer.

| Offset | Size | Field |
| --- | --- | --- |
| 0 | 8 | `magic` = ASCII `STGECRY1` |
| 8 | 2 | `iterations` u16 LE (PBKDF2 rounds) |
| 10 | 1 | `salt_len` (32) |
| 11 | 32 | PBKDF2 salt |
| 43 | 1 | `iv_len` (12) |
| 44 | 12 | AES-GCM nonce/IV |
| 56 | 4 | `ct_len` u32 LE |
| 60 | `ct_len` | AES-256-GCM ciphertext **including** the 16-byte tag |

Fixed header is 60 bytes.

* KDF: PBKDF2-HMAC-SHA256, 32-byte key, **210 000** iterations by default.
* Cipher: AES-256-GCM, 12-byte random IV, 16-byte tag appended by the cipher.
* AAD: the ASCII string `masc-steg-v1` is bound as additional authenticated data so
  the envelope cannot be transplanted into another container version.
* Salt and IV come from a CSPRNG (`crypto.getRandomValues` in JS, `getrandom` in Rust).

`flags` bit0 in the LSB header, and the `enc` flag in the §3 trailer, both indicate the
payload is such an envelope.

---

## 3. Trailing-File Container (Method B)

### 3.1 Trailer

| Offset | Size | Field |
| --- | --- | --- |
| 0 | 8 | `magic` = ASCII `STEGAPP1` |
| 8 | 2 | `name_len` u16 LE |
| 10 | 2 | `mime_len` u16 LE |
| 12 | 2 | `reserved` MUST be 0 |
| 14 | 4 | `payload_len` u32 LE |
| 18 | `name_len` | original filename, UTF-8 |
| … | `mime_len` | MIME type, UTF-8 |
| … | `payload_len` | raw file bytes |

### 3.2 Placement

**Non-PNG decoys** (JPEG, GIF, WebP, BMP, anything): the trailer is concatenated onto the
very end of the file, i.e. after the image's EOF marker. Every mainstream decoder ignores
trailing bytes, so the decoy still renders.

**PNG decoys**: appending after `IEND` technically violates the PNG specification
(`IEND` must be the final chunk). Instead the trailer is stored in a **private ancillary
chunk** inserted immediately before the `IEND` chunk:

* chunk type `stEg` — `s` lowercase ⇒ ancillary, `t` lowercase ⇒ private (not registered),
  `E` uppercase ⇒ reserved bit clear (valid), `g` lowercase ⇒ safe-to-copy.
* chunk data = the raw trailer bytes from §3.1.

The result is a 100 % spec-valid PNG that no validator will complain about. Decoders that
skip unknown ancillary chunks (all of them) render it normally.

### 3.3 Extraction

1. If the file is a PNG, walk the chunk list looking for an `stEg` chunk. If present, its
   data is the trailer; removing that chunk reconstructs the original decoy byte-for-byte.
2. Otherwise (or as a fallback) scan backwards from the end of the file for `STEGAPP1`.
3. If neither is found, fall back to **forensic carving** (§5).

---

## 4. Why PNG is mandatory for Method A

LSB data lives in the exact numeric value of each colour channel. JPEG is lossy DCT and
re-quantises chroma on every save, which destroys the low bit. PNG is lossless, so the
decoded pixel values are identical after a round trip.

**Consequence for the user:** an encoded PNG must be downloaded and moved as a raw file.
Any platform that transcodes images (X/Twitter, Discord, Instagram, Google Drive
previews, most "optimise image" pipelines) will strip the payload. Do not screenshot or
re-upload — always fetch the original file.

Method B is unaffected for the *hidden* file, but the same warning applies to JPEG decoys
if the hidden payload is itself an image.

---

## 5. Known-signature carving

When no masc trailer is present, the extractor still inspects the bytes **past the
natural EOF marker** of the image for well-known file signatures and offers to carve them
out. Recognised signatures:

| Type | Signature |
| --- | --- |
| ZIP | `50 4B 03 04` / `50 4B 05 06` / `50 4B 07 08` |
| PDF | `25 50 44 46 2D` (`%PDF-`) |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| JPEG | `FF D8 FF` |
| GIF | `47 49 46 38` |
| RIFF/AVI/WAV | `52 49 46 46` |
| WEBP | `52 49 46 46 … 57 45 42 50` |
| RAR | `52 61 72 21 1A 07` |
| 7Z | `37 7A BC AF 27 1C` |
| GZIP | `1F 8B 08` |
| BZIP2 | `42 5A 68` |
| XZ | `FD 37 7A 58 5A 00` |
| MP4/MOV | `… 66 74 79 70` (`ftyp` at offset 4) |
| OGG | `4F 67 67 53` |
| SQLite | `53 51 4C 69 74 65 20 66 6F 72 6D 61 74 20 33 00` |
| TAR | `75 73 74 61 72` at offset 257 |

ZIP length is resolved exactly by locating the End-Of-Central-Directory record (signature
`50 4B 05 06`) and taking its total size. Other types are reported as
"open-ended" and carved to EOF.

This exists so the tool is useful against files produced by *other* steganography tools
(`zip -A`, `cat a.jpg b.zip`, ImageSteg, OpenStego …), not only against its own output.
