---
kind: rules
paths:
  - "packages/workflower/extension-src/workflower/**/*"
summary: Workflower public module, package API, garden state, internal orchestration runtime, Pi adapter, private skills/commands, and bundled workflows.
triggers:
  - Workflower API
  - registerWorkflowCommand
  - registerWorkflow
  - registerWorkflowerCommand
  - package-api
  - private step command
  - private command
  - workflow-orchestration
  - pi-adapter
  - workflow lifecycle
  - /wf:<id>
  - workflower_handoff
  - workflower_state_set
  - createWorkflowerRuntime
  - setupWorkflower
  - WorkflowerSetupOptions
  - garden state
  - private skills
  - pi.workflowerSkills
  - userInvocable
  - modelInvocable
  - autoNext
  - kickoff prompt
---

# Workflower Source

The public module is both the Pi extension entrypoint and the shared API external packages import to register workflows and Workflower private step commands. Its package-root surface exposes the default setup function as named `setupWorkflower`, `registerWorkflow`, `registerWorkflowerCommand`, `createWorkflowerRuntime`, garden state/runtime/command types, `WorkflowerSetupOptions`, and workflow types, while orchestration and Pi adapter helpers stay private under `internals/`. Registry state is stored on `globalThis` so separately loaded bundles share definitions in one process. Enter here when changing that public surface, Workflower tools, private skill loading, private command resolution, or any orchestration layer behind them.

## Subdirectories

| Directory       | When to enter                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `package-api/`  | Changing exported workflow contracts, garden state types, private command types, or public integration surfaces. |
| `internals/`    | Changing registry internals, runtime use cases, active/garden state, artifacts, prompts, private skills/commands, or Pi hooks. |

## Patterns & Conventions

- Keep the package root exports as the supported integration surface for other packages.
- Keep `createWorkflowerRuntime(pi, ctx)` handler-scoped for active-garden state and deterministic handoff; do not cache it globally or reuse it across sessions.
- Externally registered user-invokable workflows should be startable through generated `/wf:<id>` commands, including workflows registered after extension load.
- Keep workflow session-clearing behavior declarative through workflow and step flags such as `clearOnStart`, `clearOnNext`, and `clearOnCompletion`.
- Preserve the active `contextBoundaryEntryId` when handing off to another workflow.
- Apply workflow/step `model` and `thinkingLevel` runtime settings through the Pi adapter before sending a start, next, or auto-next step prompt; resolve step settings before workflow defaults and captured garden-start defaults, unavailable model candidates warn without blocking the step, and completion restores captured runtime defaults.
- Keep active garden state small, finite JSON-compatible, keyed by safe state keys, and scoped to `.pi/workflows/<garden-name>/state.json`; tools, `/wf state`, and runtime state methods should require an active workflow and final completion deletes the garden state file.
- Load Workflower private skills only when setup receives a package `packageUrl`, and only from that package's `pi.workflowerSkills` `SKILL.md` files with frontmatter descriptions; resolve names from frontmatter `name` or the skill directory.
- Resolve exact `/skill:<name>` workflow step commands against registered private skills before private command lookup; inject the `SKILL.md` body in kickoff prompts and leave unknown skills as raw commands.
- Send kickoff prompts through `sendWorkflowPrompt` when available, falling back to `sendUserMessage`; keep display metadata compact through `createWorkflowPromptDisplay`/`createStepPromptDisplay`, with workflow labels including the id and optional name while step labels use the step id.
- Keep Workflower private step commands registered through package-root `registerWorkflowerCommand`; do not register them as Pi commands, render returned `prompt` content in kickoff prompts, suppress command text for `none`, and leave unknown workflow step invocations as raw commands.
- Keep Pi adapter registration idempotent per `ExtensionAPI`, including `workflower_handoff` and `workflower_state_*`, and dispose generated workflow command listeners on `session_shutdown`.
- Respect `userInvocable: false` in generated command registration and input blocking; respect `modelInvocable: false` in `workflower_handoff`.
- Keep the Pi command surface to `/wf`, generated `/wf:<id>`, and `/next`; keep state inspection under `/wf state` and use `workflower_handoff` for model-driven workflow branching instead of helper commands.
- Keep `workflower_handoff` turn-scoped: block repeat tool handoffs in one agent turn and suppress only the source step's pending auto-next.
- Do not make workflow-specific behavior part of internal runtime layers; Workflower supplies runtime registration and command orchestration.
