---
kind: rules
paths:
  - "packages/experimental-workflows/scripts/**/*"
summary: Package-local dependency-cruiser configuration for experimental-workflows linting.
triggers:
  - experimental-workflows lint
  - experimental-workflows dependency-cruiser
  - experimental-workflows lint:deps
---

# Scripts

Enter here when changing package-local lint configuration. The current dependency-cruiser config is intentionally permissive and exists to support the package `pnpm lint` script.
