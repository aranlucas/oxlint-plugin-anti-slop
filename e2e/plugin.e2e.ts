import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect } from "e2e";

type Workspace = { readonly root: string };

type Fixtures = { readonly workspace: Workspace };

const test = base.extend<Fixtures>({
  workspace: async (_fixtures, use) => {
    const root = mkdtempSync(join(tmpdir(), "anti-slop-e2e-"));

    try {
      await use({ root });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
});

test("compiled plugin reports lexical violations and accepts repaired source", ({
  workspace,
}) => {
  const config = join(workspace.root, "oxlint.json");
  const probe = join(workspace.root, "consumer.ts");

  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [
        {
          name: "anti-slop",
          specifier: fileURLToPath(new URL("../dist/index.js", import.meta.url)),
        },
      ],
      categories: { correctness: "off" },
      rules: {
        "anti-slop/no-unknown-returns": "error",
        "anti-slop/no-array-filter-map": "error",
      },
    }),
  );

  writeFileSync(
    probe,
    [
      "const C = class Promise {};",
      "export function read(): Promise<unknown> { throw 0; }",
      "const users = []; users.filter(active).map(email);",
    ].join("\n"),
  );

  const lint = () => {
    const result = spawnSync("pnpm", ["exec", "oxlint", "--config", config, probe], {
      encoding: "utf8",
      timeout: 20_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();

    return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
  };

  const rejected = lint();

  expect(rejected.status).toBe(1);
  expect(rejected.output).toContain("anti-slop(no-unknown-returns)");
  expect(rejected.output).toContain("anti-slop(no-array-filter-map)");

  writeFileSync(
    probe,
    [
      "const C = class Promise {};",
      "export function read(): string { return 'parsed'; }",
      "type Array<T> = IteratorObject<T>;",
      "export function collect(users: Array<string>) { return users.filter(active).map(email).toArray(); }",
    ].join("\n"),
  );

  const accepted = lint();

  expect(accepted.status).toBe(0);
  expect(accepted.output).not.toContain("anti-slop(");
});
