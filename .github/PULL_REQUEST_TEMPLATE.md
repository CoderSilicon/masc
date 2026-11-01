## Summary

<!-- What does this change do, and why? Keep it focused. -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Build / tooling
- [ ] Performance
- [ ] Refactor (no behaviour change)

## Format impact

- [ ] This PR does **not** change the container format.
- [ ] This PR changes the format, and I updated the spec, both cores, and the golden vectors.
- [ ] This PR changes the WASM surface, and I updated `wasm.ts` and the crate README.

## Testing

Commands run:

```bash
# e.g.
npm run check
npm run test:steg
# cd crates/steg-core && cargo test
```

Manual checks:

- [ ] Hide and reveal a message without a passphrase.
- [ ] Hide and reveal a message with a passphrase, including a wrong password.
- [ ] Hide and recover a file behind a PNG and a JPEG.
- [ ] Confirm corrupted or truncated input fails cleanly.
- [ ] Confirm existing containers still decode.

## Checklist

- [ ] I have received written permission from CoderSilicon to prepare this contribution.
- [ ] I have read and agree to the contribution terms in [CONTRIBUTING.md](https://github.com/CoderSilicon/masc/blob/main/CONTRIBUTING.md#contribution-rights).
- [ ] The change is focused and contains no unrelated reformatting.
- [ ] New behaviour or regressions are covered by tests.
- [ ] No secrets, credentials, personal data, or generated build artifacts are included.
- [ ] Documentation is updated for user-visible changes.
- [ ] This PR does **not** disclose a security vulnerability publicly.
- [ ] I have followed the [Code of Conduct](https://github.com/CoderSilicon/masc/blob/main/CODE_OF_CONDUCT.md).

## Related issues

<!-- Closes #... -->
