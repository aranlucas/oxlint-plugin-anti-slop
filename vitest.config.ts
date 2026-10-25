import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // The native CLI regression invokes several pnpm/Oxlint processes.
    testTimeout: 30_000,
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/**/*.test.ts"],
          setupFiles: ["./test/setup.ts"],
        },
      },
      {
        test: {
          name: "dist",
          include: ["test/dist.test.mjs"],
        },
      },
    ],
  },
});
