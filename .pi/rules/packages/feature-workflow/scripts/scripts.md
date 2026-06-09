---
kind: rules
paths:
  - "packages/feature-workflow/scripts/**/*"
summary: Package-local dependency-cruiser lint configuration for feature-workflow.
triggers:
  - feature-workflow lint
  - dependency cruiser feature-workflow
  - feature-workflow dependency boundaries
---

# Scripts

Enter here when changing package-local validation scripts or dependency-cruiser boundaries. Keep rules scoped to the tiny extension source; avoid adding workflow behavior or runtime helpers under `scripts/`.
