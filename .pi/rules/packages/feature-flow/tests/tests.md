---
kind: rules
paths:
  - "packages/feature-flow/tests/**/*"
summary: Vitest coverage for feature-flow domain helpers and workflow behavior.
triggers:
  - feature-flow tests
  - feature-flow vitest
  - test feature workflow
---

# tests

Enter here when adding or updating tests for feature-flow behavior. Current coverage focuses on domain helpers, feature-flow phase state, discovery model parsing/repair, workflow loading/input locking, and the workflow's artifact-writing lifecycle.

## Patterns & Conventions

- Prefer focused tests for pure domain behavior when possible.
- Use temporary directories for path and artifact tests; clean them up with `rm(..., { recursive: true, force: true })`.
- Mock only the small `FeatureWorkflowContext.ui` surface needed by the workflow under test.
- Use `FeatureWorkflowContext.discoveryModelAdapter` to test discovery loops without network calls.
