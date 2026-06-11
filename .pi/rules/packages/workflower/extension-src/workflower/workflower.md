---
kind: rules
paths:
  - "packages/workflower/extension-src/workflower/**/*"
summary: Workflower public module, package API, internal orchestration runtime, Pi adapter, and bundled workflows.
triggers:
  - Workflower API
  - registerWorkflowCommand
  - registerWorkflow
  - package-api
  - workflow-orchestration
  - pi-adapter
  - workflow lifecycle
  - /wf:<id>
  - autoNext
  - kickoff prompt
---

# Workflower Source

The public module is both the Pi extension entrypoint and the shared API external packages import to register workflows. It exports `registerWorkflow` and workflow types from `package-api/`, while orchestration and Pi adapter helpers stay private under `internals/`. Registry state is stored on `globalThis` so separately loaded bundles share definitions in one process. Enter here when changing that public surface or any orchestration layer behind it.

## Subdirectories

| Directory       | When to enter                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `package-api/`  | Changing exported workflow contracts or the public `registerWorkflow` integration surface.            |
| `internals/`    | Changing registry internals, runtime use cases, active state/artifacts, prompt rendering, or Pi hooks. |

## Patterns & Conventions

- Keep the package root exports as the supported integration surface for other packages.
- Externally registered workflows should be startable through generated `/wf:<id>` commands, including workflows registered after extension load.
- Keep workflow session-clearing behavior declarative through workflow and step flags such as `clearOnStart`, `clearOnNext`, and `clearOnCompletion`.
- Apply step `model` and `thinkingLevel` runtime settings through the Pi adapter before sending a start, next, or auto-next step prompt.
- Keep Pi adapter registration idempotent per `ExtensionAPI` and dispose generated workflow command listeners on `session_shutdown`.
- Keep the Pi command surface to `/wf`, generated `/wf:<id>`, and `/next`; do not expose internal helper commands for orchestration.
- Do not make workflow-specific behavior part of internal runtime layers; Workflower supplies runtime registration and command orchestration.
