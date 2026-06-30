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
  - model-config
  - ModelConfig
  - ModelResolution
  - ValidationResult
  - getConfigPath
  - readConfig
  - validateConfig
  - model-resolver
  - resolveModel
  - resolveModelWithFallback
  - resolveModelWithFallbackAndMetadata
  - isLevelName
  - getLevelIndex
  - LEVEL_ORDER
  - WorkflowModelLevel
  - step-metrics-store
  - step-metrics-hook
  - workflow lifecycle
  - /wf:<id>
  - /wf clean
  - /wf resume
  - /wf config
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
  - workflow pipeline
  - kickoff prompt
  - WorkflowDefinition
  - WorkflowStep
  - WorkflowModelReference
  - WorkflowModelSetting
  - WorkflowModelLevel
  - WorkflowThinkingLevel
  - advanceOnAutoNext
  - updateWorkflowStatus
  - clearWorkflowStatus
  - captureWorkflowRuntimeDefaults
  - applyWorkflowStepRuntimeSettings
  - restoreWorkflowRuntimeDefaults
  - workflowModelNotificationShown
  - applyWorkflowModelCandidates
  - formatModelResolutionNotification
---

# Workflower Source

The public module is both the Pi extension entrypoint and the shared API external packages import to register workflows and Workflower private step commands. Its package-root surface exposes the default setup function as named `setupWorkflower`, `registerWorkflow`, `registerWorkflowerCommand`, `createWorkflowerRuntime`, garden state/runtime/command types, `WorkflowerSetupOptions`, and workflow types, while orchestration and Pi adapter helpers stay private under `internals/`. Registry state is stored on `globalThis` so separately loaded bundles share definitions in one process. Enter here when changing that public surface, Workflower tools, private skill loading, private command resolution, or any orchestration layer behind them.

## Subdirectories

| Directory       | When to enter                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `commands/`     | Changing Workflower slash command handlers like `/wf config`. |
| `package-api/`  | Changing exported workflow contracts, runtime settings, garden state/runtime types, private command types, public integration surfaces, or model configuration and resolution utilities. |
| `internals/`    | Changing registry internals, runtime use cases, active/garden state, artifacts, prompts, private skills/commands, or Pi hooks. |
| `runtime/`     | Changing runtime artifacts, metrics types, or workflow execution data structures. |

## Patterns & Conventions

- Keep the package root exports as the supported integration surface for other packages.
- Keep `createWorkflowerRuntime(pi, ctx)` handler-scoped for active-garden state and deterministic handoff; do not cache it globally or reuse it across sessions.
- Externally registered user-invokable workflows should be startable through generated `/wf:<id>` commands, including workflows registered after extension load.
- Keep `/wf:<id> <garden-name> | <workflow-id>` pipeline syntax for initial starts and `/wf:<id> | <workflow-id>` for active handoffs; validate queued ids as user-invokable workflows, persist them on active state, and hand off queued workflows from final `/next` before garden completion.
- Keep workflow session-clearing behavior declarative through workflow and step flags such as `clearOnStart`, `clearOnNext`, and `clearOnCompletion`.
- Set Pi session name to garden name at workflow kickoff when `pi.setSessionName` is available.
- Set footer status to workflow and step id during step execution to provide clear workflow context.
- Clear footer status when workflow stops.
- Preserve the active `contextBoundaryEntryId` when handing off to another workflow.
- Apply workflow/step `model` and `thinkingLevel` runtime settings through the Pi adapter before sending a start, next, or auto-next step prompt; resolve step settings before workflow defaults and captured garden-start defaults, resolve level names (tiny/small/medium/large/xl) to model references via config, unavailable model candidates warn without blocking the step, and completion restores captured runtime defaults.
- Keep active garden state small, finite JSON-compatible, keyed by safe state keys, and scoped to `.workflower/workflows/<garden-name>/state.json`; keep durable resume metadata at `.workflower/workflows/<garden-name>/resume.json` refreshed on start, stop, resume, advance, and handoff; `/wf resume` should restore only valid non-completed metadata for inactive gardens, and `--step` overrides are pointer-only; tools, `/wf state`, and runtime state methods should require an active workflow, and final completion deletes garden state and resume metadata unless the active workflow sets `cleanupOnCompletion: false`.
- Collect step execution metrics when enabled, tracking token usage, tool calls, duration, and error counts.
- Load Workflower private skills only when setup receives a package `packageUrl`, and only from that package's `pi.workflowerSkills` `SKILL.md` files with frontmatter descriptions; resolve names from frontmatter `name` or the skill directory.
- Resolve exact `/skill:<name>` workflow step commands against registered private skills before private command lookup; inject the `SKILL.md` body in kickoff prompts and leave unknown skills as raw commands.
- Send kickoff prompts through `sendWorkflowPrompt` when available, falling back to `sendUserMessage`; keep display metadata compact through `createWorkflowPromptDisplay`/`createStepPromptDisplay`, with workflow labels including the id and optional name while step labels use the step id.
- Keep Workflower private step commands registered through package-root `registerWorkflowerCommand`; do not register them as Pi commands, render returned `prompt` content in kickoff prompts, suppress command text for `none`, and leave unknown workflow step invocations as raw commands.
- Keep Pi adapter registration idempotent per `ExtensionAPI`, including `workflower_handoff` and `workflower_state_*`, and dispose generated workflow command listeners on `session_shutdown`.
- Respect `userInvocable: false` in generated command registration and input blocking; respect `modelInvocable: false` in `workflower_handoff`.
- Keep the Pi command surface to `/wf`, generated `/wf:<id>`, and `/next`; keep state inspection under `/wf state`, preserved garden restoration and step overrides under `/wf resume`, inactive garden removal under `/wf clean`, model configuration under `/wf config`, and use `workflower_handoff` for model-driven workflow branching instead of helper commands.
- Keep `workflower_handoff` turn-scoped: block repeat tool handoffs in one agent turn and suppress only the source step's pending auto-next.
- Do not make workflow-specific behavior part of internal runtime layers; Workflower supplies runtime registration and command orchestration.
