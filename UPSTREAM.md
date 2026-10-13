# Upstream provenance

The rule sources in `src/` are copied from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) (MIT, © Dillon Mulroy).

| Field | Value |
| --- | --- |
| Upstream commit | `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10) |
| Copied | `src/**` (rules, Effect rules, shared helpers, vendored ESLint Stylistic, RuleTester suites) |
| Not copied | `skills/`, `scripts/sync-skill-assets.mjs`, the install skill's asset mirror |

## Local changes

- Packaging only. Rule sources are unchanged.
- Compiled to `dist/` with `tsc` (`rewriteRelativeImportExtensions`) so consumers load plain JavaScript from `node_modules`.
- `@oxlint/plugins` is a caret dependency instead of an exact pin. At runtime it only provides the `defineRule` and `eslintCompatPlugin` helpers. `oxlint` is an optional peer.
- Tests run through `node --test` (native type stripping) instead of a chained `tsx` script.

## Updating

```bash
git clone https://github.com/dmmulroy/anti-slop /tmp/anti-slop
diff -ru /tmp/anti-slop/src src        # review upstream changes
rsync -a --delete /tmp/anti-slop/src/ src/
pnpm check
```

Then update the commit above, bump the version, and add any new rules to the README config.
