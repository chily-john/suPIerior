---
kind: rules
paths:
  - 'packages/tui-tools/scripts/**/*'
summary: Package-local scripts for tui-tools validation and dependency-boundary rules.
triggers:
  - tui-tools dependency-cruiser
  - tui-tools lint deps
  - questions dependency boundary
---

# scripts

Enter here when changing package-local validation scripts for `@supierior/tui-tools`.

## Patterns & Conventions

- Keep dependency-cruiser rules aligned with questions-domain boundaries: shared code must not import features, queue must not import asking, and asking must use the queue feature entrypoint.
- Root export rules should continue to prevent package root imports from reaching into domain internals.
