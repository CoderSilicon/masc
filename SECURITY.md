# Security Policy

masc is a local-first steganography tool. It handles sensitive payloads, so security
reports are taken seriously even though the project is source-available and provided
without warranty. It doesn't open any connections requesting you anything about any information. If faced so, you allowed to inspect it.


## Reporting a vulnerability

**You are allowed toopen a public GitHub issue, discussion, or pull request for a suspected
vulnerability.**

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Or open <https://github.com/CoderSilicon/masc/security/advisories/new> directly.

If private advisories are unavailable, contact the repository owner
[@CoderSilicon](https://github.com/CoderSilicon) through GitHub and ask for a private
channel. Do not include exploit details in a public message.

### What to include

Please provide as much of the following as you can:

- A clear description of the issue and its impact.
- The affected version, commit, or branch.
- Steps to reproduce, including a minimal carrier file or payload if relevant.
- Browser, operating system, and Node/Rust versions.
- Whether the WASM backend, the TypeScript fallback, or both are affected.
- Any proof-of-concept code, screenshots, or logs (redact secrets).
- Your preferred attribution, or a request to remain anonymous.

### What to expect

These are good-faith targets, not contractual guarantees:

| Stage | Target |
| --- | --- |
| Acknowledgement | Within 3 business days |
| Initial triage and severity assessment | Within 7 business days |
| Fix or mitigation plan | Within 30 days for high/critical issues |
| Coordinated disclosure | Usually within 90 days of the report |

We will keep you informed of progress and credit you in the advisory unless you ask us
not to. Please give us a reasonable opportunity to fix the issue before publishing
details.

## Scope

### In scope

- Cryptographic implementation bugs: PBKDF2 parameters, AES-GCM nonce handling, key
  derivation, authentication-tag handling, envelope parsing, AAD binding.
- Container parser bugs: out-of-bounds reads, integer overflow, length confusion,
  malformed PNG chunks, trailer parsing, CRC handling.
- Cross-implementation divergence between the Rust core and the TypeScript mirror that
  causes corruption or weakens security.
- Path traversal or unsafe filename handling in extracted files.
- WASM boundary issues: memory safety, unexpected panics, buffer aliasing, or data
  exposure across the worker boundary.
- Cross-site scripting, injection, or unsafe DOM handling in the Svelte UI.
- Dependency vulnerabilities that are actually reachable and exploitable in masc.
- Privacy leaks: network requests, telemetry, storage, or logging of payloads,
  passphrases, or filenames.
- Bypasses of the 40-megapixel guard rail that lead to a practical denial of service.

### Out of scope

- **Recovering a payload from a re-compressed, resized, screenshotted, or edited image.**
  This is a documented property of LSB steganography, not a vulnerability.
- **Reading a payload that was hidden without a passphrase.** Hiding is not encryption.
- **Detecting that a file contains hidden data.** Steganalysis is an inherent limitation.
- **Lost or forgotten passwords.** masc has no recovery mechanism and never will.
- **A compromised browser, operating system, extension, or physical device.**
- **Denial of service by deliberately supplying enormous files** that are rejected by the
  documented size limits.
- **Social engineering, phishing, or abuse of files created with masc.**
- **Reports that require modifying the Software**, which the [LICENSE](./LICENSE) does
  not permit.
- **Theoretical issues with no demonstrated impact** on the official build.
- **Third-party services or platforms** that strip hidden data.

## Threat model

masc protects **content confidentiality** only when the user supplies a passphrase. It
does not protect the **existence** of the payload against a determined analyst, and it
does not protect against a compromised endpoint.

### Security properties

| Property | Status |
| --- | --- |
| Payload confidentiality without a passphrase | ❌ Not provided |
| Payload confidentiality with a strong passphrase | ✅ PBKDF2-HMAC-SHA256 + AES-256-GCM |
| Payload integrity with a passphrase | ✅ AES-GCM authentication tag |
| Payload integrity without a passphrase | ⚠️ CRC-32 only — detects accidental corruption, not tampering |
| Carrier plausibility | ✅ Image renders normally after embedding |
| Server-side data exposure | ✅ No server-side processing |
| Protection against local malware or a hostile browser | ❌ Out of scope |

### Cryptographic design

- **KDF:** PBKDF2-HMAC-SHA256, 32-byte key, 210,000 iterations by default.
- **Cipher:** AES-256-GCM with a 12-byte random nonce and a 16-byte authentication tag.
- **AAD:** the ASCII string `masc-steg-v1`, binding the envelope to the container version.
- **Randomness:** `crypto.getRandomValues` in JavaScript and `getrandom` in Rust. Never
  `Math.random()`.
- **Salt:** 32 bytes, generated per seal. **IV:** 12 bytes, generated per seal.
- **Envelope magic:** `STGECRY1`; see [`docs/STEGO_FORMAT.md`](./docs/STEGO_FORMAT.md) §2.

### Known limitations

- A wrong passphrase and a damaged payload are intentionally hard to distinguish; both
  produce an authentication failure.
- Decrypted plaintext and passphrases live in browser memory for the duration of the
  operation. JavaScript cannot guarantee memory zeroisation.
- The TypeScript fallback and the WASM core must remain byte-compatible. A divergence is
  a correctness and security issue.
- The UI is a static client-side application. There is no authentication layer, no
  multi-user isolation, and no server-side access control to bypass.

## Safe harbour

We welcome good-faith security research. If you make a reasonable effort to avoid privacy
violations, data loss, service disruption, and harm to others, and you follow this policy,
we will treat your research as authorised and will not pursue legal action against you.
This safe harbour does not authorise activity that is illegal under applicable law or that
violates the rights of third parties.

## Related documents

- [LICENSE](./LICENSE) — noncommercial use, modification, and ownership terms
- [CONTRIBUTING.md](./CONTRIBUTING.md) — contribution process and rights assignment
- [docs/STEGO_FORMAT.md](./docs/STEGO_FORMAT.md) — container specification
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — runtime and trust boundaries

---

© 2026 CoderSilicon. All rights reserved.
