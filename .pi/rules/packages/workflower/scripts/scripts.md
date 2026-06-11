---
kind: rules
paths:
  - "packages/workflower/scripts/**/*"
summary: Package-local dependency-cruiser lint configuration for Workflower.
triggers:
  - workflower lint
  - dependency cruiser workflower
  - workflower dependency boundaries
---

# Scripts

Enter here when changing package-local validation scripts or dependency-cruiser boundaries. Keep dependency rules aligned with the `package-api/`, `internals/workflow-orchestration/`, and `internals/pi-adapter/` separation documented under `extension-src/workflower/`. Runtime use-case `.types.ts` imports should stay within their owning use-case folder.
