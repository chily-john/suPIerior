import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "extension-src/workflower"),
      "@app": resolve(__dirname, "extension-src/workflower/app"),
      "@domain": resolve(__dirname, "extension-src/workflower/domain"),
      "@pi": resolve(__dirname, "extension-src/workflower/pi"),
      "@templates": resolve(__dirname, "extension-src/workflower/templates"),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
