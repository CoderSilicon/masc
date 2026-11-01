# Contributing to masc

Thanks for your interest in masc. The project is **proprietary and source-available**:
CoderSilicon owns it, and the [PolyForm Strict License 1.0.0](./LICENSE) lets you use it for
noncommercial purposes but not modify, redistribute, or claim it.

Contributions are invited through the process below. Submitting a contribution is **not**
permission to publish modified copies of masc; it is an offer to CoderSilicon to include
your work in the official project under the terms in
[Contribution rights](#contribution-rights).

> [!IMPORTANT]
> By opening a pull request or submitting any patch, code, documentation, design, or
> other material, you agree to the contribution terms in this document. If you do not
> agree, do not submit.
>
> PolyForm Strict does not permit modification. **Obtain written permission from
> CoderSilicon before you fork the repository or prepare a patch.** Contact
> [@CoderSilicon](https://github.com/CoderSilicon) privately through GitHub.

## Before you start

- Read the [Code of Conduct](./CODE_OF_CONDUCT.md).
- Read the [LICENSE](./LICENSE) and [SECURITY.md](./SECURITY.md).
- For a security issue, **do not open a public issue or PR**. Follow
  [SECURITY.md](./SECURITY.md).
- For a bug or feature idea, open an issue first for anything larger than a small fix.
  This avoids duplicated work and lets CoderSilicon confirm the direction before you
  spend time on it.
- Keep changes focused. Large refactors, renames, dependency swaps, and design rewrites
  need prior written agreement.

Forking the repository is not permitted by the license until CoderSilicon has given you
written permission to work on a contribution. If permission is granted, use a private fork
only to prepare the contribution, do not publish or deploy it, and delete it if the
contribution is not accepted.

## What we look for

Good contributions usually have these properties:

1. **Correctness first.** A steganography bug can silently destroy a user's payload.
2. **Format compatibility.** Existing containers must still decode.
3. **Parity.** The Rust core and the TypeScript mirror must agree byte-for-byte.
4. **Tests.** New behaviour needs a test. Bug fixes need a regression test.
5. **Small surface area.** Prefer a focused patch over a broad rewrite.
6. **Clear writing.** Code comments explain *why*, not *what*.
7. **No surprises.** No telemetry, network calls, hidden dependencies, or new storage.

## Development setup

### Requirements

- Node.js 20.19+ and npm to run the app
- Node.js 22.18+ to run `npm run test:steg` with native TypeScript stripping
- A modern browser for manual testing
- Rust and `wasm32-unknown-unknown` if you are changing the core
- `wasm-pack` for WASM builds

### Install and run

```bash
git clone https://github.com/CoderSilicon/masc.git
cd masc
npm install
npm run dev
```

The app runs at <http://localhost:5173>. The workbench is at `/steg`.

### Optional WASM toolchain

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
npm run build:wasm
```

The app prefers the WASM engine when `static/wasm/` exists and silently falls back to the
TypeScript engine otherwise. Both must pass the same tests.

### Repository map

| Path | Responsibility |
| --- | --- |
| `src/routes/` | SvelteKit pages: landing page and workbench |
| `src/lib/components/` | Layout, workbench, drop zones, and panels |
| `src/lib/steg/core.ts` | TypeScript mirror of the container formats |
| `src/lib/steg/crypto.ts` | WebCrypto envelope implementation |
| `src/lib/steg/engine.ts` | Backend selection and engine facade |
| `src/lib/steg/worker.ts` | Worker RPC protocol |
| `src/lib/steg/image.ts` | DOM-only decode/encode helpers |
| `crates/steg-core/src/` | Canonical Rust implementation |
| `docs/STEGO_FORMAT.md` | Normative format specification |
| `docs/ARCHITECTURE.md` | Runtime and module design |
| `tests/steg/` | Node tests for the TypeScript implementation |

## The parity contract

`docs/STEGO_FORMAT.md` is authoritative. If you change the format, you must update **all**
of the following in the same pull request:

1. `docs/STEGO_FORMAT.md`
2. `crates/steg-core/src/` — Rust implementation
3. `src/lib/steg/core.ts` — TypeScript mirror
4. `crates/steg-core/tests/format.rs` — goldens and Rust tests
5. `tests/steg/core.test.ts` (and related tests) — TypeScript goldens
6. Both engine adapters in `src/lib/steg/engine.ts` and `src/lib/steg/wasm.ts` if the
   public surface changes

The two implementations are expected to produce **byte-identical containers**. A patch
that changes only one side is incomplete.

## Running checks

```bash
npm run check         # Svelte + TypeScript diagnostics
npm run test:steg     # Node test suite for the TypeScript core
```

Rust tests:

```bash
cd crates/steg-core
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

WASM build, if you touched the Rust core or the bridge:

```bash
npm run build:wasm
```

Manual smoke test before opening a PR:

1. Hide a message in a PNG, reload the page, and reveal it.
2. Repeat with a passphrase, including one wrong-password attempt.
3. Hide a small ZIP behind a PNG and behind a JPEG; recover the file and the original
   decoy.
4. Try a deliberately corrupted or truncated container and confirm that masc reports an
   error instead of returning garbage.
5. Test one large image near the 40-megapixel guard rail.
6. If WASM is built, repeat the checks with the WASM backend and the TypeScript fallback.

## Coding conventions

### TypeScript / Svelte

- Follow the existing Svelte 5 runes style (`$state`, `$derived`, `$effect`).
- Keep DOM-dependent code out of `core.ts`, `crypto.ts`, and the worker.
- Use explicit types at module boundaries.
- Preserve the existing import style and file ordering.
- Do not add a runtime dependency without prior agreement.
- No `any` unless the alternative is worse; narrow with a comment explaining why.
- Keep user-facing strings clear and non-alarmist. Security limits must be stated honestly.

### Rust

- Keep the core free of DOM and JavaScript dependencies outside `wasm.rs`.
- Return the crate's typed `Error`; do not panic on malformed input.
- Treat every length, offset, and multiplication as untrusted. Use checked arithmetic.
- Prefer `#[cfg(test)]` unit tests next to the logic, plus goldens in `tests/`.
- Run `cargo fmt` and `cargo clippy` before submitting.

### Formatting and linting

- Match the surrounding formatting. Do not reformat unrelated files.
- Keep diffs reviewable. Separate refactors from behaviour changes.
- Do not commit generated files (`static/wasm/`, `target/`, `.svelte-kit/`) unless the
  change is specifically about generated output and CoderSilicon asked for it.

## Commit messages

Use a short, imperative subject line. Conventional Commits are preferred:

```text
feat: add two-plane capacity estimate
fix: reject trailers with mismatched name length
docs: clarify PNG recompression risk
test: pin LSB resync golden vector
chore: update wasm-pack
```

Keep the subject under ~72 characters. Explain the *why* in the body when the change is
not obvious. Reference an issue where one exists.

## Pull request checklist

Before you mark a pull request ready for review, confirm:

- [ ] I have received written permission from CoderSilicon to prepare this contribution.
- [ ] I have read and agree to the [contribution terms](#contribution-rights).
- [ ] The change is focused and does not include unrelated reformatting.
- [ ] Tests cover the new behaviour or regression.
- [ ] `npm run check` passes.
- [ ] `npm run test:steg` passes.
- [ ] `cargo test` passes if the Rust core changed.
- [ ] `cargo fmt --check` and `cargo clippy -- -D warnings` pass if Rust changed.
- [ ] The format spec and both implementations were updated together, if applicable.
- [ ] Existing containers still decode.
- [ ] No secrets, credentials, personal data, or generated build artifacts are included.
- [ ] Documentation was updated for user-visible changes.
- [ ] The PR does not disclose a security vulnerability publicly.

CoderSilicon may close a pull request without merging, request changes, or decline a
contribution for any reason. Opening a PR does not guarantee acceptance.

## Contribution rights

By submitting a contribution, you represent and warrant that:

1. You are the sole author of the contribution, or you have all necessary rights to
   submit it.
2. The contribution does not infringe any third-party copyright, patent, trademark, trade
   secret, or other right.
3. The contribution contains no third-party code, assets, or text unless you clearly
   identify it and its license, and CoderSilicon agrees in writing that it may be used.
4. You have the legal capacity to agree to these terms.

You hereby **assign to CoderSilicon** all right, title, and interest, throughout the world,
in and to the contribution, including all copyright and other intellectual-property
rights, effective when the contribution is submitted. To the extent that any right cannot
be assigned under applicable law, you grant CoderSilicon a perpetual, irrevocable,
worldwide, royalty-free, exclusive, sublicensable, and transferable license to use, copy,
modify, distribute, and otherwise exploit the contribution in any form.

You agree not to assert any claim to authorship, ownership, or compensation for the
contribution, and you waive moral rights to the extent permitted by law. CoderSilicon is
under no obligation to use, merge, or maintain any contribution. If CoderSilicon does not
accept your contribution, the assignment above does not apply to material that was not
incorporated into the project.

If you are contributing on behalf of an employer or another entity, you confirm that you
have authority to bind that entity to these terms.

## Questions

Open a GitHub issue for process questions that do not involve a security report. For
licensing or contribution-rights questions, contact
[@CoderSilicon](https://github.com/CoderSilicon) privately through GitHub.

---

© 2026 CoderSilicon. All rights reserved.
