---
kind: rules
paths:
  - "extensions/**/*"
summary: Thin package entrypoints for Pi extension exports.
triggers:
  - extension entrypoint
  - package extension export
  - extensions/pi-rules.ts
---

# Extensions

Enter here only when changing how the package exposes its extension to Pi. Files in this directory should stay thin and delegate implementation to `extension-src/` so runtime code remains organized by domain.
