# @aranlucas/oxlint-plugin-anti-slop

Opinionated [Oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) rules that reject low-evidence TypeScript and JavaScript patterns, packaged for npm.

This fork packages the generic rules from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) as a versioned JavaScript dependency. See [UPSTREAM.md](UPSTREAM.md) for provenance and upgrade guidance, and the [pinned upstream README](https://github.com/dmmulroy/anti-slop/blob/13909c9e07590f5a85d93c62712259fe14a883f7/README.md#rules) for inherited rule examples. Local policies are described below.

## Install

```bash
pnpm add -D oxlint @aranlucas/oxlint-plugin-anti-slop
```

Requires `oxlint` 1.78 or newer and Node 22.18 or newer.

## Configure

`.oxlintrc.json`:

```jsonc
{
  "jsPlugins": [{ "name": "anti-slop", "specifier": "@aranlucas/oxlint-plugin-anti-slop" }],
  "rules": {
    "oxc/no-accumulating-spread": "error",
    "anti-slop/no-array-filter-map": "error",
    "anti-slop/no-reduce-accumulator-copy": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-readable-spacing": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
  },
}
```

Use the same top-level `jsPlugins` and `rules` in `oxlint.config.ts`; in a Vite+ config,
place them under `lint`.

`require-readable-spacing` keeps consecutive single-line bindings grouped at any scope, including exported bindings. A binding with its own leading comment starts a new group. Multiline bindings and control-flow boundaries receive blank lines; existing blank lines are preserved.

### Silent promise failures

Enable `anti-slop/no-silent-promise-catch` to flag inline `.catch()` callbacks and the second
callback to `.then()` that discard a failure without an explanation. It covers empty bodies,
bare returns, `undefined`, and `void` applied to literals. Reporting the error, returning a
fallback, or rethrowing it is allowed. Intentional suppression needs a nonempty comment
**inside the callback**:

```ts
// Invalid: a failed save appears successful to the caller.
await save().catch(() => undefined);

// Valid: the caller receives the failure with context.
await save().catch((cause) => {
  throw new Error("Could not save the document", { cause });
});

// Valid: cleanup must not replace the failure already being propagated.
await reader.cancel().catch(() => {
  // The original stream error is rethrown by the enclosing catch block.
});
```

There is no automatic fix: recovery, propagation, and intentional suppression have different
behavior. Detection is syntactic: it also applies to non-Promise APIs named `catch` or `then`,
does not follow named callbacks, and cannot validate a comment's explanation.

### Native CLI entry points

Enable `anti-slop/prefer-import-meta-main` only for Node ESM code whose supported runtimes
all provide [`import.meta.main`](https://nodejs.org/api/esm.html#importmetamain): Node
`^22.18.0 || >=24.2.0`. The linter's own Node version does not establish the consumer's runtime
support. An engine range such as `>=22.18.0` also admits Node 23 and Node 24.0–24.1, which
do not provide the API.

```jsonc
{
  "jsPlugins": [{ "name": "anti-slop", "specifier": "@aranlucas/oxlint-plugin-anti-slop" }],
  "overrides": [
    {
      "files": ["tools/**/*.mjs"], // These tools require a compatible Node version.
      "rules": { "anti-slop/prefer-import-meta-main": "error" },
    },
  ],
}
```

```js
// Invalid under this policy: lexical paths can disagree for symlink launches.
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run();
}

// Valid: ask the runtime whether this module is the entry point.
if (import.meta.main) {
  await run();
}
```

The rule detects direct URL or filename comparisons with `process.argv[1]`; it does not
follow intermediate variables or custom path helpers, infer bundler behavior, or inspect
`package.json` for runtime support. See the [fixtures](test/rules/prefer-import-meta-main.test.ts)
for supported syntax.

There is no automatic fix. Review inversion, argument guards, cleanup, and compatibility
fallbacks before changing a comparison: it might intentionally test path equality. Keep
older-runtime compatibility modules excluded, and test launch paths (including symlinks),
inert imports, and CLI failures in the consumer.

### ESLint

The plugins are wrapped with `eslintCompatPlugin`, so they also load in ESLint flat config:

```js
import antiSlop from "@aranlucas/oxlint-plugin-anti-slop";

export default [
  { plugins: { "anti-slop": antiSlop }, rules: { "anti-slop/no-reflect-get": "error" } },
];
```

## Develop

```bash
pnpm install
pnpm check   # lint, typecheck, Vitest/RuleTester suites, build, dist smoke test
pnpm format:check
```

For focused checks, `pnpm test` runs source fixtures and CLI cases. Run `pnpm build` before
`pnpm test:dist`, which checks the compiled package through the real Oxlint CLI.

Before adding a rule, check native Oxlint capabilities and the [roadmap's evidence gate](ROADMAP.md#ordered-releases).
Add valid alternatives and false-positive cases through the existing RuleTester integration.
Export public rules from `src/index.ts` and cover new exports in `test/dist.test.mjs`.
Pilot a new policy alone in a consumer, classify diagnostics and justified exceptions, and
run that consumer's checks before wider adoption. A source commit is available to installed
consumers only after a package release.

## Release

Bump `version` in `package.json`, then create a GitHub release tagged `vX.Y.Z`. The release workflow publishes to npm with provenance.

## License

MIT. Original rules © Dillon Mulroy. The vendored ESLint Stylistic code keeps its own license in `src/vendor/eslint-stylistic/LICENSE`.
