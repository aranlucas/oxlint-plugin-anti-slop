import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

// Register every RuleTester case with Vitest instead of its synchronous fallback.
RuleTester.describe = describe;

RuleTester.it = it;
