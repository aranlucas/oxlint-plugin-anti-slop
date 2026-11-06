# Correctness and reliability audit — 2026-11-06

## Baseline and inventory (before implementation)

Clean isolated worktree at current remote default `5d21ab133c77c8fcae0e9a072b03ba31ca24f960`, after #24. No structural cleanup or unrelated edits. Tests and builds run only in CI.

Public interface: default ESLint-compatible plugin, 20 rule names, option schemas,
diagnostics, and spacing autofixes; compiled ESM and declarations are the package.
Reviewed all owned rules/shared AST analysis, vendored spacing adapter and engine,
RuleTester fixtures, native CLI probes, package exports, build and release workflows.
Source text/configuration enter through Oxlint's AST/scope APIs. Rules must respect
lexical bindings, avoid crashes/cycles and retain per-file isolation with createOnce.
The only source-writing journey is Oxlint's explicit spacing autofix; package
publishing is gated by version/tag validation and prepublish checks.

No authentication, tenants, network requests, database transactions, persisted
application state, retries or cancellation protocol exists in this library. Those
product boundaries do not apply. Resource cleanup/timeouts matter to CLI fixtures;
local temp directories must be removed even on assertion failures. CI retains the
existing unit/build/dist gates. No production services or credentials are needed.

## Findings

1. **Medium, high confidence: named class expression scope leaks.**
   `src/shared/type-alias-resolution.ts`, `collectTypeBindings` assigns all class
   names the enclosing statement scope. Trigger: `const C = class Promise {};`
   followed by `function read(): Promise<unknown> { throw 0; }`. Expected:
   `unknownReturn`; actual by static trace: builtin shadow check suppresses it.
   Likewise an outer `type Input = object` cannot resolve outside `class Input`.
   Class expressions bind their private name only inside the class. Preserve
   genuine self-reference shadowing inside the expression. Independent reviewer
   confirmed both the trigger and lexical contract.
2. **Medium, high confidence: shadowed array names treated as known arrays.**
   `src/shared/array-method.ts`, `isArrayAnnotation` trusts the spelling `Array`
   and `ReadonlyArray`. A local alias to `IteratorObject<T>` or same-named generic
   parameter makes a supported lazy filter/map pipeline report `arrayFilterMap`.
   Existing fixtures intentionally permit iterator and unknown receivers. Require
   unshadowed builtin evidence; do not introduce a TypeScript checker.

3. **Medium, high confidence: mapped binder loses shadowing to substitutions.**
   `dictionaryValueTypes` passes outer alias substitutions into a mapped value:
   `type Dict<T> = { [T in string]: T }; type Safe = Dict<unknown>;` has string
   values, but the value `T` becomes outer `unknown`. Remove only the mapped key
   from the value's substitutions, keeping other generic values intact. Reported
   independently before implementation.

## Rejected hypotheses and boundaries

- Alias expansion already records contextual substitutions and recursion paths;
  finite nested instantiation and free-name regressions from #24 are retained.
- `cause`, predicate inputs, explained rejection suppression, empty dictionary
  accumulators and conservative unknown receivers are documented exceptions.
- Syntactic analysis cannot prove arbitrary custom methods' runtime behavior;
  no speculative dataflow rewrite or new policy is justified.
- The spacing engine is vendored/pinned and has native CLI idempotence coverage;
  no proven new autofix corruption was found by inspection.

## Requested e2e framework

Verified npm metadata and downloaded the published `e2e@0.23.0` tarball (repository
`tester-army/e2e`, Node `^22.22.3 || >=24.8.0`). Read its shipped quickstart,
CI/GitHub Actions, API testing, config, fixtures and engine authoring docs after
live markdown fetch errors. `api-testing.mdx` explicitly supports engine-free
runs; `reference/config.mdx` permits a platform-only target without `app`.
Use real `e2e` with a CLI temp-workspace fixture and deterministic assertions
against compiled package output. Web/mobile engines are inapplicable. No UI,
model provider, paid dependency or login is needed. Pin the published runner in
the lockfile; no engine package is necessary.

## Validation plan

Add focused RuleTester regressions and CLI consumer journeys for the findings.
CI first runs new focused fixtures against baseline implementations and asserts
behavioral failures, then restores the fix and runs all existing checks plus e2e.
Keep JSON failure evidence as CI artifacts. No local tests/builds executed.
Independent implementation review and CI evidence pending.

Independent review confirmed all three fixes and regression assertions; the config uses the published `tests` glob option. Static lint and typecheck passed locally. No local tests or builds ran.

### CI baseline evidence

Run [42304327641](https://github.com/aranlucas/oxlint-plugin-anti-slop/actions/runs/42304327641)
reproduced exactly five expected behavior failures and four passing controls on
pre-audit sources. Downloaded and inspected the JSON artifact: both class cases
missed their diagnostic; two shadowed array cases and the mapped binder case
reported unwanted diagnostics. The workflow then failed on an unsupported Jest
report field (`numRuntimeErrorTestSuites`, absent in Vitest). Validate the actual
Vitest test totals and require assertion failures rather than infrastructure
errors. Full fixed-source CI remains pending.

### Fixed-source CI and review outcome

[CI run 42304705377](https://github.com/aranlucas/oxlint-plugin-anti-slop/actions/runs/42304705377)
passed on `af01cb3`: baseline reproduction gate, lint, typecheck, all 539 tests
(including all nine new scope fixtures), package build, compiled-package dist
probe, and the real `e2e@0.23.0` CLI reject/repair/accept journey. Independent
review found no remaining substantive findings; GitHub has no outstanding review
requirements or comments. Logs revealed upload-artifact excluded hidden `.e2e`
files by default; explicitly include them in the narrowly scoped evidence upload.
The portfolio status record tracks the final head/CI/merge outcome. No local tests
or builds, credential changes, deployments or production writes occurred.
