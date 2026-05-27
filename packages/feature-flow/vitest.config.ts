import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "extension-src/feature-flow"),
      "@app": resolve(__dirname, "extension-src/feature-flow/app"),
      "@domain": resolve(__dirname, "extension-src/feature-flow/domain"),
      "@pi": resolve(__dirname, "extension-src/feature-flow/pi"),
      "@templates": resolve(__dirname, "extension-src/feature-flow/templates"),
      "@supierior/tui-tools": resolve(__dirname, "../tui-tools/dist/index.js"),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
