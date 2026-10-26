# Upstream provenance

The rule sources in `src/` are copied from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) (MIT, © Dillon Mulroy).

| Field           | Value                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Upstream commit | `13909c9e07590f5a85d93c62712259fe14a883f7` (2026-10-13)                                                    |
| Copied          | `src/**` (generic rules, shared helpers, vendored ESLint Stylistic, RuleTester suites)                     |
| Not copied      | `src/effect/` (Effect rules), `skills/`, `scripts/sync-skill-assets.mjs`, the install skill's asset mirror |

## Local changes

- The opt-in Effect plugin was dropped. Local formatting and parser-owned AST traversal helpers enforce the shared lint policy without changing rule diagnostics.
- Runtime `typeof` exceptions are limited to rule-option parsing and ESTree literal discrimination, where representation checks are the boundary contract.
- Compiled to `dist/` with `tsc` (`rewriteRelativeImportExtensions`) so consumers load plain JavaScript from `node_modules`.
- `@oxlint/plugins` is a caret dependency instead of an exact pin. At runtime it only provides the `defineRule` and `eslintCompatPlugin` helpers. `oxlint` is an optional peer.
- Tests run through Vitest with Oxlint's `RuleTester` instead of a chained `tsx` script. Native CLI regressions and a compiled-package smoke test validate plugin loading and autofixes.
- Local opt-in `no-silent-promise-catch` and `prefer-import-meta-main` policies encode recurring portfolio findings. The latter requires runtime-compatible consumer overrides; neither rule applies automatic fixes.

## Updating

```bash
git clone https://github.com/dmmulroy/anti-slop /tmp/anti-slop
git -C /tmp/anti-slop diff <pinned-commit> HEAD -- src README.md
pnpm check
```

Port the reviewed changes into `src/` and the matching Vitest suites under `test/rules/`, preserving the local changes above. Then run `pnpm check`, update the commit above, bump the version, and add any new rules to the README config.
