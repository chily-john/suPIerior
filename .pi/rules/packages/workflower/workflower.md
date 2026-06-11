---
kind: rules
paths:
  - "packages/workflower/**/*"
summary: Pi workflow orchestration package for named multi-step workflows and persisted active state.
triggers:
  - workflower
  - /wf
  - /wf:<id>
  - /next
  - workflow orchestration
  - active workflow state
---

# Workflower

Enter here when changing named workflow orchestration, workflow registration APIs, `/wf`, `/wf:<id>`, or `/next` command behavior, auto-next behavior, session-clearing policy, or workflow artifact/state handling. Workflower persists one active workflow per Pi session under `.pi/tmp/workflows/active/<session-id>.json` and uses `.pi/workflows/<id>/<name>/` for artifacts.

## Subdirectories

| Directory        | When to enter                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `extension-src/` | Editing runtime orchestration, domain contracts, command registration, prompts, or workflows. |
| `scripts/`       | Changing dependency-cruiser boundaries or package-local lint behavior.                        |
| `tests/`         | Verifying command behavior, state mutation, registry sharing, prompts, or lifecycle choices.  |

## Package Rules

- Workflower advances by explicit user intent or step-level `autoNext` and does not validate declared output files before `/next`.
- Starts stay in the current visible session and clear model context through `contextBoundaryEntryId` unless `clearOnStart: false`; non-final advancement also keeps the visible session and clears model context through `contextBoundaryEntryId` unless `clearOnNext: false`.
- Multiple active workflows are supported across different Pi sessions; `/next`, `/wf status`, and `/wf stop` operate on the current session's active workflow, while `/wf list` can surface stale/other-session active states.
- Keep external workflow registration through `registerWorkflow` at the package root so contributed workflows share the same global registry as command handlers.
- Keep Workflower runtime-only; workflow packages or `workflower-authoring` should provide workflows and companion skills.
- Keep internal runtime helpers private unless they are intentionally added to the package-root API.
- Workflow IDs become `/wf:<id>` command names; keep id validation command-safe and duplicate ids rejected.
- Workflow names must be unique within each workflow id because artifacts live at `.pi/workflows/<id>/<name>/`.
- Workflow completion deletes artifacts by default; preserve them only when `cleanupOnCompletion: false` is set, and clears session context unless `clearOnCompletion: false` or auto-next completion prevents replacement.
- Validate changes with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
