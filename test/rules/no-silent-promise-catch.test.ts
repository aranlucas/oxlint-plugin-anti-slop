import { RuleTester } from "oxlint/plugins-dev";

import { noSilentPromiseCatchRule } from "@/rules/no-silent-promise-catch.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const error = { messageId: "silentCatch" };

tester.run("anti-slop/no-silent-promise-catch", noSilentPromiseCatchRule, {
  valid: [
    "save().catch(error => { throw error; });",
    "save().catch(error => report(error));",
    "save().catch(error => { setError(error); });",
    "load().catch(() => cachedValue);",
    "load().catch(() => null);",
    "load().catch(() => false);",
    "load().catch(() => 0);",
    "load().catch(() => []);",
    "load().catch(() => ({}));",
    "close().catch(() => { /* Preserve the original failure if cleanup also fails. */ });",
    "close().catch(() => { // The owner reports the original rejection.\n return undefined; });",
    "close().catch(() => /* Cleanup must not replace the primary error. */ undefined);",
    "close().catch(() => void reportCleanupFailure());",
    "save().then(() => undefined);",
    "save().then(() => undefined, error => { throw error; });",
    "save().finally(() => {});",
    "save().catch(handleError);",
    "save().catch();",
    "save()[method](() => {});",
    "save().catch(undefined => undefined);",
    "function run(undefined: string) { save().catch(() => undefined); }",
    "save().catch(() => { const undefined = recovery(); return undefined; });",
    "save().catch(() => { return recover(); });",
    "save().catch(() => { if (stopped) return; reportFailure(); });",
  ],
  invalid: [
    { code: "save().catch(() => {});", errors: [error] },
    { code: "save().catch(error => {});", errors: [error] },
    { code: "save().catch(() => undefined);", errors: [error] },
    { code: "save().catch(() => void 0);", errors: [error] },
    { code: "save().catch(() => { return; });", errors: [error] },
    { code: "save().catch(() => { return undefined; });", errors: [error] },
    { code: "save().catch(() => { return void 0; });", errors: [error] },
    { code: "save().catch(() => { ; });", errors: [error] },
    { code: "save().catch(async () => {});", errors: [error] },
    { code: "save().catch(function () {});", errors: [error] },
    { code: "save().catch(function ignored() { return undefined; });", errors: [error] },
    { code: "save()['catch'](() => undefined);", errors: [error] },
    { code: "save()?.catch?.(() => undefined);", errors: [error] },
    { code: "save().then(onSuccess, () => {});", errors: [error] },
    { code: "save().then(undefined, () => undefined);", errors: [error] },
    { code: "save()['then'](onSuccess, () => void 0);", errors: [error] },
    { code: "save().catch(() => { /*   */ });", errors: [error] },
    {
      code: "/* Unrelated file comment. */ save().catch(() => undefined);",
      errors: [error],
    },
  ],
});
