# Upstream provenance

The rule sources in `src/` are copied from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) (MIT, © Dillon Mulroy).

| Field           | Value                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Upstream commit | `13909c9e07590f5a85d93c62712259fe14a883f7` (2026-10-13)                                                    |
| Copied          | Generic rules, shared helpers, vendored ESLint Stylistic, and rule fixtures (now under `test/rules/`)      |
| Not copied      | `src/effect/` (Effect rules), `skills/`, `scripts/sync-skill-assets.mjs`, the install skill's asset mirror |

## Local changes

- The opt-in Effect plugin was dropped. Local formatting and parser-owned AST traversal helpers enforce the shared lint policy without changing rule diagnostics.
- Runtime `typeof` exceptions are limited to rule-option parsing and ESTree literal discrimination, where representation checks are the boundary contract.
- Distributed as compiled JavaScript rather than vendored TypeScript; `oxlint` is an optional peer so ESLint consumers can also load the package.
- Rule fixtures use Vitest with Oxlint's `RuleTester`; retain the native CLI and compiled-package checks when porting upstream changes.
- Local opt-in `no-silent-promise-catch` and `prefer-import-meta-main` policies encode recurring portfolio findings. The latter requires runtime-compatible consumer overrides; neither rule applies automatic fixes.

## Updating

```bash
git clone https://github.com/dmmulroy/anti-slop /tmp/anti-slop
git -C /tmp/anti-slop diff 13909c9e07590f5a85d93c62712259fe14a883f7 HEAD -- src README.md
```

Port reviewed changes into `src/` and the matching suites under `test/rules/`, preserving the local adaptations above and the [vendored Stylistic adaptations](src/vendor/eslint-stylistic/UPSTREAM.md). Follow the [development checks](README.md#develop), update the pinned revision here, and update consumer configuration for new rules before [releasing](README.md#release).
