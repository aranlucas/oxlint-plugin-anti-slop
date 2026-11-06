import type { E2EConfig } from "e2e";

export default {
  tests: "e2e/**/*.e2e.ts",
  targets: [{ name: "oxlint-cli", platform: "cli" }],
  workers: 1,
  retries: 0,
} satisfies E2EConfig;
