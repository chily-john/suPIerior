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
  - workflower_handoff
  - autoNext
  - kickoff prompt
---

# Workflower Source

The public module is both the Pi extension entrypoint and the shared API external packages import to register workflows. It exports `registerWorkflow` and workflow types from `package-api/`, while orchestration and Pi adapter helpers stay private under `internals/`. Registry state is stored on `globalThis` so separately loaded bundles share definitions in one process. Enter here when changing that public surface, the `workflower_handoff` tool, or any orchestration layer behind them.

## Subdirectories

| Directory       | When to enter                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `package-api/`  | Changing exported workflow contracts or the public `registerWorkflow` integration surface.            |
| `internals/`    | Changing registry internals, runtime use cases, active state/artifacts, prompt rendering, or Pi hooks. |

## Patterns & Conventions

- Keep the package root exports as the supported integration surface for other packages.
- Externally registered workflows should be startable through generated `/wf:<id>` commands, including workflows registered after extension load.
- Keep workflow session-clearing behavior declarative through workflow and step flags such as `clearOnStart`, `clearOnNext`, and `clearOnCompletion`.
- Preserve the active `contextBoundaryEntryId` when handing off to another workflow.
- Apply workflow/step `model` and `thinkingLevel` runtime settings through the Pi adapter before sending a start, next, or auto-next step prompt; resolve step settings before workflow defaults and captured garden-start defaults, unavailable model candidates warn without blocking the step, and completion restores captured runtime defaults.
- Keep Pi adapter registration idempotent per `ExtensionAPI`, including `workflower_handoff`, and dispose generated workflow command listeners on `session_shutdown`.
- Keep the Pi command surface to `/wf`, generated `/wf:<id>`, and `/next`; use `workflower_handoff` for model-driven workflow branching instead of helper commands.
- Keep `workflower_handoff` turn-scoped: block repeat tool handoffs in one agent turn and suppress only the source step's pending auto-next.
- Do not make workflow-specific behavior part of internal runtime layers; Workflower supplies runtime registration and command orchestration.
