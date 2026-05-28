---
kind: rules
paths:
  - "packages/feature-flow/scripts/**/*"
summary: Package-local scripts for feature-flow validation and dependency-boundary rules.
triggers:
  - feature-flow dependency-cruiser
  - feature-flow lint deps
  - feature-flow scripts
---

# scripts

Enter here when changing package-local validation scripts for `@supierior/feature-flow`.

## Patterns & Conventions

- Keep dependency-cruiser rules aligned with the source architecture: domain and templates must not depend on the Pi adapter layer.
- If new source areas are added, update lint rules to preserve intended dependency direction rather than only documenting the convention.
