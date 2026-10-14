import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

export function registerRuleTester() {
  RuleTester.describe = describe;
  RuleTester.it = it;
}
