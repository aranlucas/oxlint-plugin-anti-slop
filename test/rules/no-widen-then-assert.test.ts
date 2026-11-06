import { RuleTester } from "oxlint/plugins-dev";

import { noWidenThenAssertRule } from "@/rules/no-widen-then-assert.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const error = { messageId: "widenThenAssert" };

tester.run("anti-slop/no-widen-then-assert", noWidenThenAssertRule, {
  valid: [
    "const widened: unknown = {}; function read(widened: unknown) { return widened as { id: string }; }",
    "const widened: unknown = {}; function read() { return widened as { id: string }; }",
    "const source = { id: 'first' }; const widened: unknown = source;",
    "declare const input: unknown; const parsed = input as { readonly id: string };",
  ],
  invalid: [
    {
      code: "function read() { const widened: unknown = {}; return widened as { id: string }; }",
      errors: [error],
    },
    {
      code: "const source = { id: 'second' }; const widened: unknown = source; const parsed = widened as { readonly id: string };",
      errors: [error],
    },
  ],
});
