// Lints probe files with the native Oxlint CLI against the compiled `dist/` entry points,
// proving the published JavaScript (not the TypeScript sources) loads and reports.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = (path) => fileURLToPath(new URL(`../dist/${path}`, import.meta.url));
const probeRoot = mkdtempSync(join(tmpdir(), "anti-slop-dist-"));
const config = join(probeRoot, "oxlint.json");
const probe = join(probeRoot, "probe.ts");

try {
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [
        { name: "anti-slop", specifier: dist("index.js") },
      ],
      rules: {
        "anti-slop/no-reflect-get": "error",
        "anti-slop/require-readable-spacing": "error",
        "anti-slop/no-unknown-parameters": "error",
      },
    }),
  );
  writeFileSync(
    probe,
    [
      "export const value = Reflect.get(globalThis, 'x');",
      "export function read(input: unknown) { return input; }",
      "",
    ].join("\n"),
  );

  const result = spawnSync("pnpm", ["exec", "oxlint", "--config", config, probe], {
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  assert.equal(result.status, 1, output);
  assert.match(output, /anti-slop\(no-reflect-get\)/, output);
  assert.match(output, /anti-slop\(require-readable-spacing\)/, output);
  assert.match(output, /anti-slop\(no-unknown-parameters\)/, output);
  console.log("dist smoke test passed");
} finally {
  rmSync(probeRoot, { recursive: true, force: true });
}
