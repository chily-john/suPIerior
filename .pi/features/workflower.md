# Workflower Feature Summary

## Purpose

Build **Workflower** as a brand-new Pi package in this monorepo. Workflower is a thin, generic workflow/session gluer for Pi. It should not be a continuation of `packages/feature-flow`; `feature-flow` will be retired later.

The motivating use case is the user's repeated feature-planning workflow:

1. Have an agent grill the user about a feature.
2. Generate a feature-summary artifact.
3. Start a fresh agent/session to turn that artifact into a GitHub-issues artifact.
4. Start a fresh agent/session to review the issues artifact for implementation quality/philosophy.
5. Start a fresh agent/session to create GitHub issues from the reviewed artifact.
6. Later, potentially automate issue implementation and orchestration/parallelization.

However, Workflower itself must **not** know about feature planning, GitHub issues, review philosophy, or implementation orchestration. It only sequences configurable steps and creates fresh Pi sessions between steps.

## Background / Lessons From `feature-flow`

`feature-flow` became too large and brittle because it tried to add a prettier TUI question system and workflow behavior at the same time. The TUI work produced low reward for high complexity.

Workflower should explicitly avoid that path:

- No custom TUI polish in V1.
- No question UI in V1.
- No elaborate artifact validation in V1.
- No broad workflow DSL in V1.
- No branching/parallelism in V1.
- Keep the generic glue separate from concrete workflow modules/steps.

The priority is the clean session transition:

```text
run step -> user verifies/completes work -> /next -> fresh Pi session -> next step kickoff prompt
```

Fresh context is core. If the user had to manually copy/paste prompts into a new session, the workflow would only save a small amount of time and would not meet the goal.

## Core Design Decision

Workflower should be a **Pi extension** because Pi extension command contexts expose the needed session replacement API.

Relevant Pi capability discovered in docs/examples:

```ts
await ctx.newSession({
  parentSession,
  withSession: async (replacementCtx) => {
    await replacementCtx.sendUserMessage(kickoffPrompt);
  },
});
```

Important details:

- `ctx.newSession()` creates a fresh session.
- The old session/runtime is torn down.
- A new `session_start` is emitted.
- `withSession` receives a replacement-session context.
- The replacement context can immediately send the kickoff prompt via `sendUserMessage`.
- Do not use captured old session-bound objects after session replacement.

This confirms Workflower can automatically advance into a fresh context.

## V1 Scope

### In Scope

Workflower V1 is a simple linear workflow runner:

- TypeScript workflow definitions.
- One active workflow per project.
- Ordered step execution.
- Fresh Pi session for step 0 and for every `/next` transition.
- Step-to-step file handoff by convention using declared output filenames.
- Lightweight durable state on disk.
- A generated kickoff prompt for each step.
- Slash commands for starting, advancing, status, and cancellation.

### Out of Scope / Non-goals

Do **not** implement these in V1:

- TUI wizard/question system.
- Pretty custom UI.
- JSON/YAML workflow DSL.
- Branching workflows.
- Conditional execution.
- Parallel execution.
- Multiple active workflows in one project.
- Artifact existence checks.
- Artifact schema validation.
- Automatic parsing/guessing of output file paths from agent responses.
- Full GitHub issue orchestration beyond whatever a concrete step command does.
- Implementation-agent orchestration.
- Prompt/skill/agent DSL with rich `kind` options.
- Machine-validated input declarations.

## Naming

Package/product name: **Workflower**.

Suggested package names to consider:

- `@supierior/workflower`
- `@supierior/pi-workflower`

The exact package name can be decided during implementation, but the product/feature name should be Workflower.

## Package Boundary

Workflower should be a whole new package in the monorepo. Do not rewrite or repurpose `packages/feature-flow` for V1.

A likely structure:

```text
packages/workflower/
  src/
    index.ts              # Pi extension entry point
    workflow.ts           # defineWorkflow/types
    state.ts              # active state read/write
    prompt.ts             # kickoff prompt builder
    commands.ts           # slash command registration/handlers
    registry.ts           # workflow definition registry
```

Concrete workflows may initially live inside this package for testing, but the desired long-term separation is:

```text
packages/workflower/       # generic glue
packages/workflows/        # concrete workflow definitions/step commands/modules
```

The generic runner must not depend on feature-specific logic.

## Workflow Working Directory

Every workflow run creates a stable working directory:

```text
.pi/workflows/<workflow-type>/<workflow-name>/
```

Example:

```text
.pi/workflows/feature/my-login-flow/
  feature.md
  issues.md
  reviewed-issues.md
```

The workflow definition declares `type`; the user supplies `workflow-name` when starting the workflow.

The working directory is used as the shared artifact/handoff location. Steps are instructed to read previous outputs from this directory and write expected outputs into this directory.

## State Storage

Use project-local disk state under `.pi/tmp`.

V1 state path:

```text
.pi/tmp/workflows/active.json
```

Only one active workflow per project is supported in V1, so `/next` reads this one active state file.

Example active state:

```json
{
  "workflowId": "feature-to-github-issues",
  "type": "feature",
  "name": "my-login-flow",
  "workdir": ".pi/workflows/feature/my-login-flow",
  "currentStepIndex": 1,
  "startedAt": "2026-06-02T00:00:00.000Z",
  "updatedAt": "2026-06-02T00:10:00.000Z"
}
```

State must be persisted to disk because every step transition creates a new Pi session and extension runtime state may be rebuilt.

## Workflow Definition Shape

Use TypeScript definitions, not JSON.

Minimal V1 step type:

```ts
export type WorkflowStep = {
  id: string;
  command: string;
  outputs?: string[];
};
```

Minimal V1 workflow type:

```ts
export type WorkflowDefinition = {
  id: string;
  type: string;
  steps: WorkflowStep[];
};
```

`label`, `instructions`, `inputs`, and `target.kind` are intentionally omitted in V1.

Rationale:

- `label` is unnecessary until a UI/status display proves it needs friendlier names.
- `instructions` risks moving step-specific logic into the gluer.
- `inputs` are redundant in a simple linear chain.
- `kind`/target unions add abstraction before the need is proven.

### Outputs

`outputs` are optional but recommended.

Behavior:

- If a step declares `outputs`, those paths are resolved relative to the workflow working directory.
- The current step kickoff prompt tells the agent where to write those outputs.
- On `/next`, the completed step's declared outputs become the previous-output handoff for the next step.
- If a step declares no outputs, no automatic file handoff is passed to the next step.
- The runner does not check whether output files exist before advancing.

Example workflow:

```ts
export default defineWorkflow({
  id: "feature-to-github-issues",
  type: "feature",
  steps: [
    { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
    { id: "plan-issues", command: "/feature-plan-issues", outputs: ["issues.md"] },
    { id: "review-issues", command: "/feature-review-issues", outputs: ["reviewed-issues.md"] },
    { id: "create-github-issues", command: "/github-create-issues" },
  ],
});
```

## Command Model

Workflower should be operated through slash commands.

Potential V1 commands:

```text
/workflow start <workflow-id> <workflow-name>
/next
/workflow status
/workflow cancel
```

A leaner invocation is acceptable if clear:

```text
/workflow <workflow-id> <workflow-name>
/next
```

The critical requirement: the user should only need to type:

```text
/next
```

No workflow id/name/type should be required for normal advancement.

### Conditional `/next` Registration

It may be possible to hide `/next` unless a workflow is active by only registering it when active workflow state exists at extension/session startup. Pi docs indicate `pi.registerCommand()` can be called during extension load or `session_start`, and newly registered commands are refreshed immediately.

However, V1 does **not** require perfect hiding/unregistering. If unregistering is not available, it is acceptable for `/next` to remain registered and show a friendly error when there is no active workflow.

Optional later refinement: avoid registering `/next` on the final step or when no workflow is active.

## Start Workflow Behavior

Starting a workflow should immediately create a fresh Pi session for step 0.

Reason: step 0 should not inherit the conversation where the user asked to start the workflow.

Flow:

```text
/workflow start feature-to-github-issues my-login-flow
  -> load workflow definition
  -> ensure no other active workflow, or fail/ask to cancel first
  -> create .pi/workflows/feature/my-login-flow/
  -> write .pi/tmp/workflows/active.json with currentStepIndex = 0
  -> create a new Pi session
  -> automatically send kickoff prompt for step 0
```

## `/next` Behavior

`/next` advances blindly.

Flow:

```text
/next
  -> read .pi/tmp/workflows/active.json
  -> load matching workflow definition
  -> increment currentStepIndex
  -> if no next step:
       clear active state
       notify workflow complete
       do not create another session unless a clear reason emerges
     else:
       update active state on disk
       create a new Pi session
       automatically send kickoff prompt for next step
```

No output existence checks. No validation. If the user types `/next`, they are saying the step is complete enough to continue.

## Kickoff Prompt

Each step starts from a generated prompt sent automatically into the fresh session.

The prompt should include only minimal workflow context:

- Workflow id/type/name.
- Workflow working directory.
- Previous step outputs, if any.
- Current step id.
- Current step command.
- Current step expected outputs, if any.
- Instruction to run/proceed with the current step.

Example kickoff prompt:

```md
You are running a Workflower workflow step.

Workflow:

- id: feature-to-github-issues
- type: feature
- name: my-login-flow

Workflow working directory:
.pi/workflows/feature/my-login-flow

Previous step outputs:

- .pi/workflows/feature/my-login-flow/feature.md

Current step:

- id: plan-issues
- command: /feature-plan-issues

Expected outputs for this step:

- .pi/workflows/feature/my-login-flow/issues.md

Run the current step now. Use the previous outputs as input. Write any expected outputs to the exact paths listed above. When this step is complete, the user will run /next to continue the workflow.
```

Important: do not parse prompt text to resolve workflow state. Prompt text is for the agent. Disk state is for the extension.

## Completion Semantics

V1 completion is manual and user-driven:

- The agent/module does its work.
- The user decides if it is good enough.
- The user types `/next`.
- Workflower advances without checks.

Do not support all completion mechanisms at once. Specifically avoid adding these in V1:

- agent self-notifies gluer
- module returns artifact path
- artifact validation gates
- output path guessing

These can be added later if the simple model proves insufficient.

## Relationship to Modules / Steps

The conversation used the word “modules,” but the preferred distinction is:

- **Workflow**: an ordered sequence of steps.
- **Step**: one queued unit in the workflow.
- **Command**: slash command/prompt/skill invocation configured on the step.
- **Working directory**: shared file handoff location.

In V1, the step command is just a string such as `/feature-discovery`. Workflower does not need to know whether that command is backed by a prompt template, skill, extension command, or another package.

The complicated logic belongs in the command/module being invoked, not in Workflower.

## Multiple Workflows

V1 supports exactly one active workflow per project.

Reason:

- Keeps `/next` trivial and unambiguous.
- Avoids session-to-workflow mapping complexity.
- Matches current expected usage.

Future option if needed:

- Store session-bound workflow state keyed by session id/file under `.pi/tmp/workflows/sessions/`.
- Then `/next` could resolve based on the current Pi session.

Do not implement that in V1.

## Error Handling Expectations

Keep errors simple and explicit:

- Starting a workflow with unknown `workflow-id`: notify error.
- Starting a workflow while one is already active: notify error and suggest `/workflow cancel` first.
- `/next` with no active workflow: notify “No active workflow.”
- Active state references missing workflow definition: notify error; do not mutate state.
- Final `/next`: clear active state and notify complete.
- Failure to create workdir/state file: notify error.
- Failure during `ctx.newSession`: leave state consistent if possible and notify error.

## Implementation Notes / Pi API

Workflower should use extension commands because only command contexts expose session replacement methods like `ctx.newSession()`.

Key docs consulted:

- Pi README: Sessions, extensions, programmatic usage.
- `docs/extensions.md`: `ExtensionCommandContext`, `ctx.newSession`, `withSession`, `sendUserMessage`, command registration.
- `docs/sdk.md`: session runtime and session replacement behavior.
- Example: `examples/extensions/handoff.ts` demonstrates creating a new session and placing/sending handoff context.

Critical footgun from docs:

- After session replacement, the old command context and old session-bound objects are stale.
- Put post-replacement work inside `withSession` and use only the `replacementCtx` passed there.

Safe pattern:

```ts
const kickoffPrompt = buildKickoffPrompt(...);
const parentSession = ctx.sessionManager.getSessionFile();

const result = await ctx.newSession({
  parentSession,
  withSession: async (replacementCtx) => {
    await replacementCtx.sendUserMessage(kickoffPrompt);
  }
});

if (result.cancelled) {
  ctx.ui.notify("New session cancelled", "info");
}
```

## Suggested V1 Implementation Plan

1. Create new package for Workflower.
2. Add package metadata and Pi package manifest/extension entry.
3. Define workflow and step types.
4. Implement `defineWorkflow()` helper.
5. Implement workflow registry for TypeScript definitions.
6. Implement filesystem utilities:
   - ensure `.pi/tmp/workflows/`
   - ensure `.pi/workflows/<type>/<name>/`
   - read/write/delete `active.json`
7. Implement kickoff prompt builder.
8. Register `/workflow` command:
   - parse `start <workflow-id> <workflow-name>`
   - validate workflow exists
   - create workdir/state
   - create fresh session and send step 0 prompt
9. Register `/next` command:
   - read active state
   - advance index blindly
   - complete or create fresh session and send next prompt
10. Add `/workflow status` and `/workflow cancel` if cheap; otherwise postpone.
11. Add unit tests for pure logic:

- state path generation
- workdir path generation
- prompt construction
- next-step output handoff behavior
- final-step completion behavior

12. Add a simple concrete feature workflow definition for smoke testing, but keep it obviously separate from the generic runner.

## Open Questions for Implementing Agent

These should be resolved during implementation, not by expanding scope prematurely:

1. Exact package name/path: `packages/workflower` vs `packages/pi-workflower`.
2. Exact slash command syntax for start: `/workflow start ...` vs `/workflow ...`.
3. Whether `/workflow status` and `/workflow cancel` are included in initial commit or follow-up.
4. Whether workflows are discovered via package exports, local registry array, or extension configuration for V1.
5. Whether to call the generic active state file `active.json` or include more package-specific naming.

## Core Principle

Workflower succeeds if it feels like a tiny, boring session conveyor belt:

```text
/start workflow -> fresh step 0 -> /next -> fresh step 1 -> /next -> fresh step 2 -> done
```

It should not become a workflow language, TUI system, artifact validator, or feature-planning domain package in V1.
