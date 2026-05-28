import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@app": resolve(__dirname, "extension-src/pi-rules/app"),
      "@pi": resolve(__dirname, "extension-src/pi-rules/pi"),
      "@domain": resolve(__dirname, "extension-src/pi-rules/domain"),
      "@features": resolve(__dirname, "extension-src/pi-rules/features"),
      "@shared": resolve(__dirname, "extension-src/pi-rules/shared"),
      "@": resolve(__dirname, "extension-src/pi-rules"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
