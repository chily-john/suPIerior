---
kind: rules
paths:
  - "packages/experimental-workflows/extension-src/experimental-workflows/package-api/**/*"
summary: Exported experimental workflow definitions for counter and stateful-grilling demos.
triggers:
  - counterWorkflow definition
  - counterLoopWorkflow definition
  - statefulGrillingWorkflow definition
  - statefulGrillingFinalizeWorkflow definition
  - counter workflow steps
  - counter-loop workflow steps
  - stateful-grilling workflow steps
  - stateful-grilling-finalize workflow steps
  - experimental workflow model setting
---

# Package API

Enter here when changing the exported workflow definitions consumed by this package's extension entrypoint and tests. These definitions are examples for Workflower workflow authors, so keep the contracts obvious in the object literals and synchronized with the private skill prompts.

## Patterns & Conventions

- Keep `counter` responsible for initialization and first handoff, with `counter-loop` responsible for increment/continue iterations.
- Keep `stateful-grilling` responsible for ask/update/routing loops, with `stateful-grilling-finalize` responsible for writing `feature-description.md`.
- Preserve handoff-only workflows as model-invokable internal workflows unless intentionally changing the demonstrations.
- Keep auto-advance, `clearOnNext`, cleanup, and output choices aligned with the README smoke tests and package tests.
