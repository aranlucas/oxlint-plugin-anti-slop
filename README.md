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

The compiled-package probe uses Vitest's assertions reporting and per-test cleanup instead of a standalone Node test script. It still requires exit status 1 and diagnostics for all three probe rules; a missing build or a failed child process fails the test. This checks a packaging boundary that source-only rule tests cannot cover.
