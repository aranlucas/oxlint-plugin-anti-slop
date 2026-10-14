import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
    environment: "node",
    // The native CLI regression invokes several pnpm/Oxlint processes.
    testTimeout: 30_000,
  },
});
