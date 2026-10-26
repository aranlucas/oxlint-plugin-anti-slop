# Turn recurring findings into lint rules

Review a fresh worktree from the project's fetched `origin/main`. Retain the starting commit,
the source locations, and the exact lint/test commands with the finding. A search match is a
candidate; read its callers, error boundary, cleanup, and tests before calling it a defect.

## Choose the existing rule first

Use native Oxlint rules for complexity, empty catch statements, async Promise executors,
floating promises, and misused promises. The type-aware promise rules require the project's
TypeScript configuration and `oxlint-tsgolint`. Use this package for behavior the native rules
cannot express; do not add a standalone checker or a second test runner.

The `no-silent-promise-catch` policy arose from repeated empty rejection handlers and
`catch(() => undefined)` in application code. Current examples include stream cancellation in
`pediatric-interviewer-esp32`, cache writes in `openmessage`, and UI persistence in `career-ops`.
Cleanup and cache failures may be intentionally suppressed, so the rule accepts an explanation
inside the callback. These examples establish a recurring review obligation, not a claim that
every suppression is a bug.

## Add and verify a rule

1. Keep the detection narrow. Document what it can prove and what it cannot infer.
2. Add `test/rules/<name>.test.ts` using the existing RuleTester/Vitest integration. Include
   production-derived examples, valid alternatives, scope shadowing, computed properties,
   optional syntax, and cases that must stay unreported.
3. Export the rule from `src/index.ts`. Add a compiled-package probe to `test/dist.test.mjs`
   when the public export changes.
4. Run `pnpm check` and `pnpm format:check`. This exercises source fixtures, types, lint,
   build output, and the actual CLI loading the compiled package.
5. Scan a consumer with only the new rule first. Classify the diagnostics, fix real bugs,
   document justified exceptions, then run that consumer's normal lint, types, and tests.

For an installed version containing the rule, add this to the consumer's existing native config:

```json
{
  "jsPlugins": [{ "name": "anti-slop", "specifier": "@aranlucas/oxlint-plugin-anti-slop" }],
  "rules": {
    "anti-slop/no-silent-promise-catch": "error",
    "eslint/complexity": ["error", { "max": 9, "variant": "classic" }]
  }
}
```

Run `pnpm exec oxlint --format json src > lint-review.json` for a machine-readable report.
Use the project's actual source directories in place of `src`. Review the command's exit
status: a nonzero status must remain a visible failure. Keep generated/vendored source
exclusions in the consumer config and record them alongside measurements.

## Measure refactoring

For a complete baseline, use a separate audit config with all categories disabled and
`eslint/complexity: ["warn", { "max": 0, "variant": "classic" }]`. Run the same native
Oxlint command against the same file set before and after a change. The report names each
function and its measured score; the normal enforcement config keeps `max: 9`.

Classic complexity begins at one and counts branches, including conditionals, loops, switch
cases, short-circuit operators, optional chaining, and default initializers. A plain `else`
does not add an independent decision. Guard clauses reduce nesting without necessarily
reducing this score. Extracting helpers reduces the paths a caller must understand, but does
not by itself eliminate total business decisions. Record both the changed function and any
new helpers, and preserve edge-case behavior with the project's existing test runner.

Repeat after each verified chunk. Re-fetch and rebase before integration if `origin/main`
moved. Publish package changes through the repository's release workflow before updating
consumer versions; a local source commit does not make a new rule available on npm.
