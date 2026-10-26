import { RuleTester } from "oxlint/plugins-dev";

import { preferImportMetaMainRule } from "@/rules/prefer-import-meta-main.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const error = { messageId: "preferMain" };

const urlImport = 'import { pathToFileURL, fileURLToPath } from "node:url";';

tester.run("anti-slop/prefer-import-meta-main", preferImportMetaMainRule, {
  valid: [
    "if (import.meta.main) run();",
    "if (!import.meta.main) returnValue();",
    `${urlImport} const path = fileURLToPath(import.meta.url);`,
    `${urlImport} import.meta.url === pathToFileURL(process.argv[2]).href;`,
    `${urlImport} import.meta.url === pathToFileURL(process.execPath).href;`,
    `${urlImport} import.meta.url === pathToFileURL(filename).href;`,
    `${urlImport} other.url === pathToFileURL(process.argv[1]).href;`,
    `${urlImport} fileURLToPath(other.url) === process.argv[1];`,
    `${urlImport} fileURLToPath(import.meta.url) === process.argv[0];`,
    `${urlImport} process.argv[1] === other.filename;`,
    `${urlImport} import.meta.url < pathToFileURL(process.argv[1]).href;`,
    `${urlImport} import.meta.url === pathToFileURL(process.argv[index]).href;`,
    `${urlImport} import.meta[key] === pathToFileURL(process.argv[1]).href;`,
    `${urlImport} import.meta.url === pathToFileURL(process.argv[1])[key];`,
    `${urlImport} import.meta.url === pathToFileURL(...process.argv).href;`,
    `${urlImport} import.meta.url === pathToFileURL(process.argv[1], options).href;`,
    `${urlImport} const isMain = import.meta.url === pathToFileURL?.(process.argv[1]).href;`,
    `${urlImport} const isMain = import.meta.url === pathToFileURL(process.argv?.[1]).href;`,
    `${urlImport} const isMain = import.meta.url === pathToFileURL(process.argv[1])?.href;`,
    `${urlImport} const isMain = import.meta.url === pathToFileURL(process?.argv[1]).href;`,
    `${urlImport} const isMain = (import.meta.url as string) === pathToFileURL(process.argv[1]).href;`,
    `${urlImport} const mainUrl = pathToFileURL(process.argv[1]).href; import.meta.url === mainUrl;`,
    `${urlImport} function check(process) { return import.meta.url === pathToFileURL(process.argv[1]).href; }`,
    `${urlImport} function check(pathToFileURL) { return import.meta.url === pathToFileURL(process.argv[1]).href; }`,
    `${urlImport} function check(fileURLToPath) { return fileURLToPath(import.meta.url) === process.argv[1]; }`,
    `${urlImport} { const process = fake; import.meta.url === pathToFileURL(process.argv[1]).href; }`,
    'import { pathToFileURL } from "custom-url"; import.meta.url === pathToFileURL(process.argv[1]).href;',
    'import { fileURLToPath } from "custom-url"; fileURLToPath(import.meta.url) === process.argv[1];',
    'import url from "custom-url"; import.meta.url === url.pathToFileURL(process.argv[1]).href;',
    "const pathToFileURL = custom; import.meta.url === pathToFileURL(process.argv[1]).href;",
    "import.meta.url === pathToFileURL(process.argv[1]).href;",
    'import process from "custom-process"; import.meta.filename === process.argv[1];',
    'import { env as process } from "node:process"; import.meta.filename === process.argv[1];',
    'import type { pathToFileURL } from "node:url"; import.meta.url === pathToFileURL(process.argv[1]).href;',
    'import { type pathToFileURL } from "node:url"; import.meta.url === pathToFileURL(process.argv[1]).href;',
    'import type process from "node:process"; import.meta.filename === process.argv[1];',
    'import * as url from "node:url"; function check(url) { return import.meta.url === url.pathToFileURL(process.argv[1]).href; }',
    'import * as url from "node:url"; import.meta.url === url[method](process.argv[1]).href;',
    'import * as url from "node:url"; import.meta.url === url.pathToFileURL.call(null, process.argv[1]).href;',
    "// import.meta.url === pathToFileURL(process.argv[1]).href",
    'const example = "import.meta.filename === process.argv[1]";',
    "require.main === module;",
  ],
  invalid: [
    {
      name: "Lucas Kit and Digits guarded CLI pattern",
      code: `${urlImport} if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { await run(); }`,
      errors: [error],
      output: null,
    },
    ...["===", "!==", "==", "!="].flatMap((operator) => [
      {
        name: `URL comparison ${operator}`,
        code: `${urlImport} import.meta.url ${operator} pathToFileURL(process.argv[1]).href;`,
        errors: [error],
      },
      {
        name: `reversed URL comparison ${operator}`,
        code: `${urlImport} pathToFileURL(process.argv[1]).href ${operator} import.meta.url;`,
        errors: [error],
      },
      {
        name: `filename comparison ${operator}`,
        code: `import.meta.filename ${operator} process.argv[1];`,
        errors: [error],
      },
      {
        name: `reversed converted filename comparison ${operator}`,
        code: `${urlImport} process.argv[1] ${operator} fileURLToPath(import.meta.url);`,
        errors: [error],
      },
    ]),
    ...[
      'import { pathToFileURL as toUrl } from "url"; import.meta.url === toUrl(process.argv[1]).href;',
      'import { "pathToFileURL" as toUrl } from "node:url"; import.meta.url === toUrl(process.argv[1]).href;',
      'import { fileURLToPath as toPath } from "url"; toPath(import.meta.url) === process.argv[1];',
      'import * as url from "node:url"; import.meta.url === url.pathToFileURL(process.argv[1]).href;',
      'import url from "node:url"; import.meta.url === url.pathToFileURL(process.argv[1]).href;',
      'import { default as url } from "node:url"; import.meta.url === url.pathToFileURL(process.argv[1]).href;',
      'import url from "url"; url.fileURLToPath(import.meta.url) === process.argv[1];',
      'import * as url from "url"; url.fileURLToPath(import.meta.url) === process.argv[1];',
      'import process from "node:process"; import.meta.filename === process.argv[1];',
      'import proc from "process"; proc.argv[1] === import.meta.filename;',
      'import * as proc from "node:process"; import.meta.filename === proc.argv[1];',
      'import { default as proc } from "node:process"; import.meta.filename === proc.argv[1];',
      `${urlImport} import.meta['url'] === pathToFileURL(process['argv']['1'])['href'];`,
      'import * as url from "node:url"; import.meta.url === url["pathToFileURL"](process.argv[1]).href;',
      'import * as url from "node:url"; url["fileURLToPath"](import.meta.url) === process.argv[1];',
      'import.meta["filename"] === process["argv"][1];',
      "if (import.meta.main ?? process.argv[1] === import.meta.filename) run();",
      `${urlImport} if (import.meta.main ?? import.meta.url === pathToFileURL(process.argv[1]).href) run();`,
      `${urlImport} (import.meta.url) === (pathToFileURL(process.argv[1]).href);`,
      `${urlImport} function check() { return import.meta.url === pathToFileURL(process.argv[1]).href; }`,
      `${urlImport} { const pathToFileURL = custom; } import.meta.url === pathToFileURL(process.argv[1]).href;`,
    ].map((code) => ({ code, errors: [error], output: null })),
  ],
});
