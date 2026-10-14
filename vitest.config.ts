import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    environment: "node",
    // The native CLI regression invokes several pnpm/Oxlint processes.
    testTimeout: 30_000,
  },
});
