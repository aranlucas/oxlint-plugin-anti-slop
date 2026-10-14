import assert from "node:assert/strict";
import { RuleTester } from "oxlint/plugins-dev";
import { it, test } from "vitest";
import plugin from "@/index.ts";
import { registerRuleTester } from "@test/helpers/rule-tester.ts";

test("source and helper aliases resolve at runtime", () => {
  registerRuleTester();
  assert.equal(RuleTester.it, it);
  assert.equal(Object.keys(plugin.rules).length, 18);
});
