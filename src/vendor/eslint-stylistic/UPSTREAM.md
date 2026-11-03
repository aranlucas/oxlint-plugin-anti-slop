# Vendored padding-line-between-statements

Source: [ESLint Stylistic](https://github.com/eslint-stylistic/eslint-stylistic), commit `435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08`.

Copied files:

- `packages/eslint-plugin/rules/padding-line-between-statements/padding-line-between-statements.ts`
- `packages/eslint-plugin/rules/padding-line-between-statements/types.d.ts` → `padding-line-options.d.ts`
- Root `LICENSE`, retained verbatim. Both OpenJS Foundation and ESLint Stylistic notices apply.

The rule is MIT-licensed. Keep `LICENSE` with every redistributed copy. No Stylistic, ESLint, TypeScript-ESLint, or additional parser runtime dependency is required.

## Local adaptations

- Replace upstream type aliases with Oxlint's ESTree, context, token/comment, and rule types. Upstream's token type includes comments; Oxlint exposes those separately.
- Replace `AST_NODE_TYPES` enum members with identical string literals.
- Guard indexed reads for consuming repositories with `noUncheckedIndexedAccess`. Impossible missing AST/configuration entries raise explicit invariant errors rather than introducing new non-null assertions.
- Replace the repository-specific `createRule` factory with `createPaddingLineRule(options, statementTypes?)`. The anti-slop wrapper supplies typed options directly; it exposes no user configuration options. The optional second argument registers caller-defined statement types, consulted before the upstream table, so a policy can match syntax the upstream matchers do not distinguish (exported bindings, comment ownership) without editing the vendored tables.
- Implement the small required AST helper surface in `padding-line-ast.ts` using Oxlint's public source-code/token API. `isParenthesized` only needs the one-pair check used to exclude parenthesized directive strings, not the upstream general-purpose overloads.
- Retain the upstream statement matchers, scope tracking, comment-aware insertion/removal, selector support, and diagnostic text. Upstream naming and non-null assumptions remain localized here to keep future diffs reviewable; the file is not a model for new application code.

The opinionated policy lives in [`../../rules/require-readable-spacing.ts`](../../rules/require-readable-spacing.ts); it adds spacing without collapsing existing blank lines. Keep policy changes there so upstream diffs stay reviewable.

## Updating and verification

Fetch an explicit upstream revision, compare the original rule and types against this revision, and port relevant fixes while retaining the adapters above. Update this record, preserve the license, and run `pnpm check`.

Focused [RuleTester fixtures](../../../test/rules/require-readable-spacing.test.ts) and a [native CLI regression](../../../test/rules/require-readable-spacing-cli.test.ts) cover fixes, comments, and repeated-fix stability. The complete upstream JS/TS suites have not been ported; these checks do not establish full upstream conformance.
