---
kind: rules
paths:
  - "packages/feature-workflow/extension-src/**/*"
summary: Feature-workflow Pi extension source for feature-doc and implementation loop workflows.
triggers:
  - feature-workflow extension
  - new-feature workflow registration
  - take-it-away workflow registration
  - feature-doc workflow registration
  - implementation-doc-loop workflow registration
  - implementation-stories-split workflow registration
  - story-implementation-loop workflow registration
  - register feature workflows
---

# Extension Source

This package has a minimal extension surface whose job is to register the public `new-feature`, `take-it-away`, and `feature-doc` workflows plus private implementation-loop workflows with Workflower and ship their Workflower-only private skills. Enter here when changing how the package contributes those workflows at Pi extension startup or how their bundled skill prompts are organized.

## Subdirectories

| Directory            | When to enter                                                                     |
| -------------------- | --------------------------------------------------------------------------------- |
| `feature-workflow/`  | Editing the public extension entrypoint, package workflow definitions, or bundled private skill prompts. |
