// Lints probe files with the native Oxlint CLI against the compiled `dist/` entry points,
// proving the published JavaScript (not the TypeScript sources) loads and reports.
import assert from "node:assert/strict";
import { test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** @param {string} path */
const dist = (path) => fileURLToPath(new URL(`../dist/${path}`, import.meta.url));

test("the compiled package loads and reports all probe violations", (t) => {
  const probeRoot = mkdtempSync(join(tmpdir(), "anti-slop-dist-"));
  t.onTestFinished(() => rmSync(probeRoot, { recursive: true, force: true }));

  const config = join(probeRoot, "oxlint.json");

  const probe = join(probeRoot, "probe.ts");

  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [{ name: "anti-slop", specifier: dist("index.js") }],
      rules: {
        "anti-slop/no-reflect-get": "error",
        "anti-slop/require-readable-spacing": "error",
        "anti-slop/no-unknown-parameters": "error",
        "anti-slop/no-silent-promise-catch": "error",
      },
    }),
  );
  writeFileSync(
    probe,
    [
      "export const value = Reflect.get(globalThis, 'x');",
      "export function read(input: unknown) { return input; }",
      "Promise.reject(new Error('save failed')).catch(() => undefined);",
      "",
    ].join("\n"),
  );

  const result = spawnSync("pnpm", ["exec", "oxlint", "--config", config, probe], {
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  assert.ifError(result.error);
  assert.equal(result.status, 1, output);
  assert.match(output, /anti-slop\(no-reflect-get\)/, output);
  assert.match(output, /anti-slop\(require-readable-spacing\)/, output);
  assert.match(output, /anti-slop\(no-unknown-parameters\)/, output);
  assert.match(output, /anti-slop\(no-silent-promise-catch\)/, output);
});
