import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "extension-src/workflower"),
      "@package-api": resolve(__dirname, "extension-src/workflower/package-api"),
      "@pi-adapter": resolve(__dirname, "extension-src/workflower/internals/pi-adapter"),
      "@orchestration": resolve(
        __dirname,
        "extension-src/workflower/internals/workflow-orchestration",
      ),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
