---
kind: rules
paths:
  - "packages/workflower/**/*"
summary: Pi workflow orchestration package for named multi-step workflows, persisted active state, and garden state.
triggers:
  - workflower
  - /wf
  - /wf clean
  - /wf:<id>
  - /next
  - workflower_handoff
  - workflower_state_set
  - workflower_state_get
  - workflower_state_list
  - createWorkflowerRuntime
  - garden state
  - private skills
  - pi.workflowerSkills
  - userInvocable
  - modelInvocable
  - workflow orchestration
  - active workflow state
---

# Workflower

Enter here when changing named workflow orchestration, workflow registration APIs, `/wf`, `/wf clean`, `/wf:<id>`, `/next`, `workflower_handoff`, `workflower_state_*`, `createWorkflowerRuntime`, or private skill loading behavior, auto-next behavior, session-clearing policy, or workflow artifact/state handling. Workflower persists one active workflow per Pi session under `.workflower/tmp/workflows/active/<session-id>.json`, stores garden state at `.workflower/workflows/<garden-name>/state.json`, and uses `.workflower/workflows/<garden-name>/<sequence>-<workflow-id>/` for flower artifacts.

## Subdirectories

| Directory        | When to enter                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `extension-src/` | Editing runtime orchestration, domain contracts, command registration, prompts, or workflows. |
| `scripts/`       | Changing dependency-cruiser boundaries or package-local lint behavior.                        |
| `tests/`         | Verifying command behavior, state mutation, registry sharing, prompts, or lifecycle choices.  |

## Metaphor and Naming Policy

Workflower may use gardening/flower language as product personality, but plain engineering names are the default for stable interfaces. Use metaphor where it improves visualization or delight; do not use metaphor where it obscures behavior, harms searchability, or leaks into stable APIs without explicit approval.

- Prefer plain engineering names for TypeScript APIs, persisted state keys, debugging output, internal module names, file names, extension interfaces, and low-level runtime concepts.
- Prefer gardening language for user-facing copy, docs introductions, examples, status messages, command descriptions, and workflow visualizations when it makes the workflow easier or more fun to understand.
- A metaphor term can become a core Workflower domain term only when it maps cleanly to a distinct concept, is consistently understandable, and the user explicitly approves it.
- Before introducing a new gardening metaphor term or expanding an existing term into API/state/runtime semantics, pause and ask for confirmation. Present the plain engineering equivalent, proposed scope, and whether renaming later would be painful.
- Confirmation choices should distinguish: user-facing metaphor only, accepted core domain term, reject/use engineering name, or rename/rework.
- Existing accepted terms include `garden` for active workflow workspace/state grouping and `flower` for workflow artifacts/runs. Treat more opaque terms, such as `pollen`, cautiously and explain their engineering equivalent when used.
- When in doubt, keep the implementation searchable and conventional, then add metaphor at the UX/documentation layer.

## Package Rules

- Workflower advances by explicit user intent or step-level `autoNext` and does not validate declared output files before `/next`.
- Workflow and step `model` values use Pi `provider/model-id` references or ordered fallbacks; step candidates take precedence over workflow defaults and captured garden-start defaults, and unavailable candidates warn and keep the current/default model.
- Initial starts stay in the current visible session and clear model context through `contextBoundaryEntryId` unless `clearOnStart: false`; non-final advancement also keeps the visible session and clears model context through `contextBoundaryEntryId` unless `clearOnNext: false`.
- Handoffs via `/wf:<id>` while active or `workflower_handoff` reuse the current garden, mark the previous flower `handedOff`, pass indexed pollen, and do not apply the target workflow's `clearOnStart`.
- `/wf:<id>` pipe syntax queues user-invocable downstream workflows for final-step handoff before garden completion, including auto-next handoff.
- `userInvocable: false` suppresses generated `/wf:<id>` commands and blocks exact hidden slash input; `modelInvocable: false` rejects `workflower_handoff` targets.
- Kickoff prompts use compact visible `workflower-prompt` labels while sending the full prompt to model context; do not treat hidden private-skill text as failed injection.
- Garden state is for small JSON-compatible active-garden facts; expose it through `/wf state`, `workflower_state_*`, and `createWorkflowerRuntime(pi, ctx).state`, not as large reports or logs.
- Keep private skill discovery and registration internal to Workflower; workflow packages opt in through setup options rather than exported skill registries.
- Multiple active workflows are supported across different Pi sessions; `/next`, `/wf status`, and `/wf stop` operate on the current session's active workflow, while `/wf list` can surface stale/other-session active states and `/wf clean <garden-name>` refuses gardens active in any tracked session.
- Keep external workflow registration through `registerWorkflow` at the package root so contributed workflows share the same global registry as command handlers.
- Keep deterministic extension integrations on the package-root `createWorkflowerRuntime` facade for active-garden state and handoff.
- Keep Workflower runtime-only; workflow packages or `workflower-authoring` should provide workflows and companion skills.
- Keep internal runtime helpers private unless they are intentionally added to the package-root API.
- User-invokable workflow IDs become `/wf:<id>` command names; keep id validation command-safe and duplicate ids rejected.
- Initial garden names must be safe path segments; active handoffs create the next numbered flower in the current garden.
- Keep runtime-owned state and artifacts under `.workflower/` and create `.workflower/.gitignore` so run data stays untracked.
- Workflow completion deletes garden state and artifacts by default; `cleanupOnCompletion: false` preserves that workflow's flower artifacts, and on the active completing workflow also preserves garden state; completion clears session context unless `clearOnCompletion: false` or auto-next completion prevents replacement.
- Validate changes with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
