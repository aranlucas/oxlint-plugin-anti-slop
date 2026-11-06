# Untangle decisions — 2026-11-06

## Scope and baseline

Whole repository, including rules, shared AST analysis, vendored spacing engine,
fixtures, packaging, documentation, and workflows. Both comment and test additions
are selected. Started at `389f196` with a clean worktree; preserve the intentional
documentation and fixture pruning in #20 and #21. No local tests, test builds,
benchmarks, or browser tests will run. CI already runs lint, typecheck, source
behavior fixtures and compiled-package CLI probes; recent CI is green. There are
no test processes owned by this newly started run.

## Inventory and design (recorded before implementation)

- Use the shared scope resolver for value bindings; keep syntax unwrapping at the
  caller, because each rule intentionally accepts different wrappers.
  - `array-method.ts` duplicates the upward lexical scope walk in `scope.ts`.
  - `no-widen-then-assert.ts` scans all scope references by source offsets and
    threads a manually captured scope list through its analysis. This needlessly
    couples rule traversal order and the scope manager representation.
- Keep the complete set of function contract syntax in one typed visitor helper.
  - `no-object-parameters`, `no-unknown-parameters`, and `no-unknown-returns` copy
    the same owner union and ten visitor entries. Adding a signature syntax must
    currently change all three in lockstep.
- Remove unused analysis products, rather than maintaining speculative APIs.
  - `TypeAliasEnvironment.aliases` collects aliases without any reader.
  - `isPopulatedObjectExpression` has no callers.
- Remove comments in owned sources that only restate functions, rule metadata,
  or visible branches. Retain assertion safety invariants, external policy
  boundaries, licensing, and vendored upstream commentary to keep diffs useful.
- Keep existing behavioral tests: the recent pruning already removed redundant
  fixtures. Add only scope-shadowing/function-boundary regressions for the
  binding refactor and syntax coverage for the shared contract visitor.

## Deliberate boundaries and special cases retained

- `cause` and type-predicate input exceptions are explicit lint policy.
- Empty dictionary accumulators, nested assertion suppression and unknown array
  receivers avoid documented false positives; different widening classifiers
  encode different policies and must not be collapsed by spelling alone.
- Alias cycles, missing arguments, lexical shadowing, imports, mapped and infer
  binders are conservative syntax analysis, not a substitute for TypeScript's
  checker. Generic dictionary substitutions differ from boolean alias matching;
  a general type engine is outside this structural pass.
- Safety-marker parsing, global built-in shadowing, and entry-point runtime
  compatibility are real input/API boundaries. Keep them.
- The vendored spacing engine and its local adapter remain isolated, licensed,
  and pinned; do not modernize upstream internals speculatively.
- Rule registration, README examples and selective dist probes have different
  contracts; generating them from the implementation would weaken independent
  checks. No new dependency or custom maintenance script is needed: AST types,
  scope access and fixture execution use the existing Oxlint APIs.

## Review and validation

Pending independent review and CI. Local test results are intentionally absent.

### Independent inventory review

The first reviewer confirmed the scope duplication and unused analysis products.
It also found two consequences of duplicated lexical analysis, now included in
this design: dictionary substitutions could overwrite a same-named generic
parameter with `Readonly<T>` and recurse forever; module-only interface lookup
could override a nearer concrete alias or miss local empty interfaces. Share the
existing contextual substitution implementation and resolve interfaces through
nearest lexical bindings. Once this removes the dictionary-specific environment,
use the existing type-alias environment directly instead of preserving a wrapper.
The return rule must also check lexical bindings before treating `Promise` and
`PromiseLike` as built-ins. New fixtures cover those behaviors, not helper internals.
No existing test was removed: the reviewer found the remaining fixtures meaningful.

The second review found two further resolver issues in the shared mechanism:
caller generics leaked into free names of callee alias bodies, and recursion
markers incorrectly suppressed finite nested instantiations such as
`Identity<Identity<unknown>>`. Callee maps now contain only their own parameters;
argument substitutions carry the caller's expansion path as well as its binding
map. Defaults capture preceding callee parameters. Regression fixtures distinguish
finite nesting and lexical free names from true cycles.

Initial PR CI ran source fixtures successfully and found introduced static issues:
the shared scope helper accepted only identifier references although array analysis
also passes parameter bindings, and conditional property spread violated lint.
Broaden the helper to Oxlint's identifier node union and return interface bindings
explicitly. No baseline failures or local test execution were involved.

The final reviewer found one remaining alias-entry path in broad dictionary keys:
non-generic key aliases still received caller substitutions. Clear that map on
entry (there are no parameters), retaining the cycle path; a widening fixture
checks that a module key alias stays broad inside a same-named generic context.
Interface emptiness evidence now also requires all nearest bindings to be
interfaces, preserving valid class/interface merging; a concrete owner fixture
protects that conservative boundary.

CI on `7956a6e` passed source fixtures, typecheck, build and dist smoke tests.
Its sole failure was the preset's inline-object-type policy on the widened helper
parameter; give the identifier discriminator a module-level name. Validation
remains CI-only.
