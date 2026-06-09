---
kind: rules
paths:
  - "packages/feature-workflow/extension-src/**/*"
summary: Feature-workflow Pi extension source for registering package workflows.
triggers:
  - feature-workflow extension
  - new-feature workflow registration
  - take-it-away workflow registration
  - register feature workflows
---

# Extension Source

This package has a minimal extension surface whose job is to register the `new-feature` and `take-it-away` workflows with Workflower. Enter here only when changing how the package contributes those workflows at Pi extension startup.

## Subdirectories

| Directory            | When to enter                                                                     |
| -------------------- | --------------------------------------------------------------------------------- |
| `feature-workflow/`  | Editing the public extension entrypoint or package workflow definitions. |
