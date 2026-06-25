---
kind: rules
paths:
  - "packages/experimental-workflows/extension-src/**/*"
summary: Experimental-workflows Pi extension source for playground workflow definitions and bundled private skills.
triggers:
  - experimental-workflows extension
  - register experimental workflows
  - counter workflow registration
  - counter-loop workflow registration
  - stateful-grilling workflow registration
  - stateful-grilling-finalize workflow registration
---

# Extension Source

Enter here when changing how the experimental package contributes workflows at Pi extension startup or how its bundled private skill prompts are organized. The extension source should stay thin: workflow definitions live under the package API, while Pi binding and private skill loading are delegated through Workflower setup.

## Subdirectories

| Directory                   | When to enter                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `experimental-workflows/`   | Editing the public extension entrypoint, package workflow definitions, Pi adapter, or private skill prompts. |
