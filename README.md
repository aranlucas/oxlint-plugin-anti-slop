# @aranlucas/oxlint-plugin-anti-slop

Opinionated [Oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) rules that reject low-evidence TypeScript and JavaScript patterns, packaged for npm.

This is a published fork of [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop). Upstream is meant to be copied into each repository. This package compiles the same rules to JavaScript so every repo can install one versioned dependency. See [UPSTREAM.md](UPSTREAM.md) for the pinned upstream commit and the local changes. Rule documentation and examples live in the [upstream README](https://github.com/dmmulroy/anti-slop#rules).

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

The same `jsPlugins` and `rules` go under `lint` in an `oxlint.config.ts` or a Vite+ config.

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

The rule has no automatic fix: logging, recovery, propagation, and intentional suppression
have different behavior. It inspects static method names, including computed string names
and optional calls; it does not infer promise types, follow named callbacks, or prove that
a comment's explanation is correct. A custom non-Promise API named `catch` or `then` follows
the same callback policy when this rule is enabled. Shadowed `undefined` values and
`void reportFailure()` are not mistaken for no-op handlers.

Native `eslint/no-empty` checks catch statements and `eslint/no-empty-function` checks empty
functions. Neither targets rejection callbacks returning `undefined`, while banning every
empty callback also rejects unrelated listener stubs. This rule supplies that focused policy
through the existing Oxlint AST and RuleTester APIs. See the
[repeatable review workflow](docs/review-workflow.md) for adoption and evidence requirements.

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

The rule reports equality and inequality comparisons in either order between:

- `import.meta.url` and `pathToFileURL(process.argv[1]).href`;
- `import.meta.filename` or `fileURLToPath(import.meta.url)` and `process.argv[1]`.

It resolves named, aliased, default, and namespace imports from `node:url`/`url` and
default/namespace imports from `node:process`/`process`. Static computed property names work;
shadowed variables and imports from unrelated packages do not match. Detection stays local
to the comparison: it does not follow intermediate variables, CommonJS imports, optional
chains, TypeScript expression wrappers, or custom path-normalization helpers. It does not
infer bundler behavior or inspect `package.json` to decide whether to enable itself.

There is no automatic fix. Review inversion, surrounding argument guards, cleanup, and
compatibility fallbacks before replacing a comparison; a comparison might intentionally
test path equality rather than main-module identity. Preserve tests for direct, relative,
symlink, directory, and encoded-path launches, inert imports, and CLI failures. Older-runtime
compatibility modules should keep this rule disabled with their runtime constraint recorded.
Native `unicorn/prefer-import-meta-properties` covers `dirname` and `filename`, not this
entry-point policy; the custom rule uses the existing Oxlint AST and RuleTester APIs.

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
```

## Release

Bump `version` in `package.json`, then create a GitHub release tagged `vX.Y.Z`. The release workflow publishes to npm with provenance.

## License

MIT. Original rules © Dillon Mulroy. The vendored ESLint Stylistic code keeps its own license in `src/vendor/eslint-stylistic/LICENSE`.

Tests run through two [Vitest projects](https://vitest.dev/guide/projects.html). `pnpm test` and `pnpm test:watch` select the `unit` project for the RuleTester and source CLI cases. After `pnpm build`, run `pnpm test:dist` to select the `dist` project and check the compiled package through the real Oxlint CLI. `pnpm check` runs both in build order, as does CI.

The compiled-package probe uses Vitest's assertions reporting and per-test cleanup instead of a standalone Node test script. It still requires exit status 1 and diagnostics for all configured probe rules; a missing build or a failed child process fails the test. This checks a packaging boundary that source-only rule tests cannot cover.
