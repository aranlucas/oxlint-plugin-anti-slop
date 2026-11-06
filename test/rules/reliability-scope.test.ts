import { RuleTester } from "oxlint/plugins-dev";

import { noObjectParametersRule } from "@/rules/no-object-parameters.ts";
import { noUnknownReturnsRule } from "@/rules/no-unknown-returns.ts";
import { noArrayFilterMapRule } from "@/rules/no-array-filter-map.ts";
import { noUnsafeDictionaryTypeRule } from "@/rules/no-unsafe-dictionary-type.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("class expression private type name", noObjectParametersRule, {
  valid: ["type Input = object; const C = class Input { read(value: Input) {} };"],
  invalid: [
    {
      code: "type Input = object; const C = class Input {}; function read(value: Input) {}",
      errors: [{ messageId: "objectParameter" }],
    },
  ],
});

tester.run("class expression builtin name", noUnknownReturnsRule, {
  valid: ["const C = class Promise<T> { read(): Promise<unknown> { return this; } };"],
  invalid: [
    {
      code: "const C = class Promise {}; function read(): Promise<unknown> { throw 0; }",
      errors: [{ messageId: "unknownReturn" }],
    },
  ],
});

tester.run("shadowed array names", noArrayFilterMapRule, {
  valid: [
    "type Array<T> = IteratorObject<T>; function collect(users: Array<User>) { return users.filter(active).map(email).toArray(); }",
    "function collect<ReadonlyArray>(users: ReadonlyArray) { return users.filter(active).map(email); }",
  ],
  invalid: [
    {
      code: "function collect(users: Array<User>) { return users.filter(active).map(email); }",
      errors: [{ messageId: "arrayFilterMap" }],
    },
  ],
});

tester.run("mapped value binder", noUnsafeDictionaryTypeRule, {
  valid: ["type Dict<T> = { [T in string]: T }; type Safe = Dict<unknown>;"],
  invalid: [
    {
      code: "type Dict<T> = { [K in string]: T }; type Unsafe = Dict<unknown>;",
      errors: [{ messageId: "unsafeDictionary" }],
    },
  ],
});
