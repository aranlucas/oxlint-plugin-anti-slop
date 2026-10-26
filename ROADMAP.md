# Anti-slop plugin feature roadmap

Updated 2026-10-26. Proposed developer-facing work, not a package-release claim.
Use owned `aranlucas`/`sidequest-labs` consumers for new portfolio adoption work.

## Starting point

At `bc71ca97b33b94e15579025702f121fdfee149c2`, the [package](README.md)
contains the generic forked rules plus opt-in silent-promise-failure and native
ESM-entry-point policies. Source RuleTester cases, compiled CLI probes and a
[repeatable review workflow](docs/review-workflow.md) already exist. They provide
the foundation for useful detection; more rules are not inherently more value.

## Ordered releases

1. **Turn a diagnostic into a correct next action.** Improve existing rule
   messages and local documentation with the matched obligation, a minimal
   example, valid alternatives and the boundary the rule cannot prove.
   Acceptance: a maintainer can distinguish a defect from intentional cleanup
   or runtime compatibility; suppression has a precise rationale. Do not
   auto-fix error propagation, cancellation or runtime support decisions.
2. **Promote repeated defects through an evidence queue.** For each proposed
   new rule, retain two independently reviewed owned-codebase examples,
   counterexamples, the missing native capability and a consumer pilot.
   Acceptance: reject a custom rule when native Oxlint or type-aware rules
   provide the behavior; semantic contracts such as provider cancellation or
   token ownership stay in runtime tests when syntax cannot prove them.
3. **Expose predictable rule compatibility.** Publish a compact rule catalog
   showing supported syntax, required consumer runtimes, fix availability and
   known blind spots. Acceptance: catalog claims correspond to source fixtures
   and compiled-package probes; a Node runtime requirement is never inferred
   from the Node version running the linter.
4. **Keep the fork explainable during upgrades.** Make upstream changes and
   local policy differences straightforward to inspect with release notes and
   the existing provenance record. Acceptance: new exports work in the built
   package, local rules retain their regression cases, and a merged change is
   not described as available to consumers until published.

## First slice and evaluation

Pilot the two existing opt-in policies in compatible owned services before
inventing another rule. Record diagnostics reviewed, useful findings, false
positives, justified exceptions and time to resolve each. Retain small sanitized
fixtures in the existing Vitest/RuleTester suites, not copies of private code.
Promote defaults only after reviewing the results with the consuming policy.

Oxforge owns shared preset selection; this package owns narrowly testable AST
detection; each product owns behavior and its integration tests. Keep native
commands and current test runners as the repeatable execution path.
