# Workflower Next Updates Implementation Plan

## Purpose

Fix Workflower `autoNext` and `clearOnNext` behavior without relying on Pi queued slash-command execution.

Workflower currently supports step-level `autoNext`. When an auto-next step finishes, the extension attempts to queue `/next` with:

```ts
pi.sendUserMessage("/next", { deliverAs: "followUp" });
```

In the installed Pi runtime, `pi.sendUserMessage()` injects literal user messages and intentionally disables command/template expansion. As a result, `/next` is delivered to the LLM as literal text instead of executing Workflower's registered `/next` command. The agent then becomes confused and can loop around the literal `/next` message.

This document describes the implementation to fix that by:

1. Reusing Workflower's internal next-step advancement logic directly for auto-next.
2. Replacing `clearOnNext` session replacement with a Workflower context-boundary system.
3. Keeping `clearOnStart` and `clearOnCompletion` session-based where command context is available.

Another agent should be able to pick this up and implement from this document.

## Relevant Package Rules

Source of truth for Workflower package guidance:

- `.pi/rules/packages/workflower/workflower.md`

Important rules to preserve:

- Workflower advances by explicit user intent or step-level `autoNext` and does not validate declared output files before `/next`.
- Only one active workflow is supported.
- Keep external workflow registration through the package root.
- Workflow completion deletes artifacts by default; preserve them only when `cleanupOnCompletion: false` is set.
- Validate with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

## Current Implementation Overview

Important files:

- `packages/workflower/extension-src/workflower/pi/register.ts`
  - Registers `/workflow` and `/next`.
  - Registers `agent_end` handler for `autoNext`.
  - Currently queues literal `/next` via `pi.sendUserMessage()`.

- `packages/workflower/extension-src/workflower/app/next.ts`
  - Exports `advanceWorkflow(ctx, currentSession?)`.
  - Reads active workflow state.
  - Increments `currentStepIndex`.
  - Writes active state.
  - Sends next kickoff prompt.
  - Uses `ctx.newSession()` by default for `clearOnNext` semantics.
  - Handles workflow completion and optional workdir cleanup.

- `packages/workflower/extension-src/workflower/app/start.ts`
  - Exports `startWorkflow(args, ctx, currentSession?)`.
  - Uses `ctx.newSession()` by default for `clearOnStart` semantics.
  - This should remain session-based.

- `packages/workflower/extension-src/workflower/domain/state.ts`
  - Defines `ActiveWorkflowState` and persistence helpers.
  - Needs to be extended to store context-boundary state.

- `packages/workflower/extension-src/workflower/templates/kickoff.ts`
  - Renders kickoff prompt.

- `packages/workflower/tests/workflower.test.ts`
  - Existing tests cover command registration, auto-next queuing, state, start, next, completion, cleanup, etc.
  - Tests need updates for the new behavior.

## Pi Runtime Findings

The installed Pi version inspected was `0.78.0`; the available npm update `0.78.1` was also inspected. Both retain the same behavior relevant to this bug.

### `session.prompt()`

Pi's internal `AgentSession.prompt()` path checks extension commands first when prompt expansion is enabled:

```ts
if (expandPromptTemplates && text.startsWith("/")) {
  const handled = await this._tryExecuteExtensionCommand(text);
  if (handled) return;
}
```

So `session.prompt("/next")` would execute `/next` as an extension command.

### `pi.sendUserMessage()`

Extension `pi.sendUserMessage()` internally calls `prompt()` with command/template expansion disabled:

```ts
await this.prompt(text, {
  expandPromptTemplates: false,
  streamingBehavior: options?.deliverAs,
  images,
  source: "extension",
});
```

Therefore `pi.sendUserMessage("/next", { deliverAs: "followUp" })` sends literal `/next` to the model.

### Extension API limitation

Workflower cannot simply switch from `pi.sendUserMessage()` to `session.prompt()` because extensions are not given the `AgentSession` object or a `ctx.prompt()` method.

Also, `agent_end` handlers receive normal `ExtensionContext`, not `ExtensionCommandContext`; they do not have `ctx.newSession()`. Pi documents session control methods as command-only because they can deadlock in event handlers.

## Desired Behavior After Update

### Manual `/next`

Manual `/next` should continue to work as a user command.

Expected semantics:

- If the completed step has `clearOnNext !== false`, Workflower sets a model-context boundary before sending the next kickoff.
- If the completed step has `clearOnNext === false`, Workflower does not set a new boundary; the next step sees prior workflow-step context.
- It should no longer call `ctx.newSession()` for normal step-to-step advancement.
- It should still advance state blindly by user intent.
- It should still not validate output files.

### Auto-next

Auto-next should no longer send `/next` as a user message.

Expected semantics:

- On `agent_end`, if the current active step has `autoNext: true`, Workflower should invoke the same internal advancement path used by manual `/next`.
- Auto-next should preserve completion cleanup behavior.
- Auto-next should preserve `clearOnNext` boundary behavior.
- Auto-next should not require command context or `ctx.newSession()` for non-completion step advancement.

### `clearOnNext`

`clearOnNext` should be reinterpreted from “create a fresh Pi session” to “set a Workflower context boundary so the model only sees messages after the boundary.”

Rules:

- `clearOnNext` omitted or `true`:
  - Set/update the boundary to the current session leaf before sending the next kickoff prompt.
- `clearOnNext: false`:
  - Do not set/update the boundary.
  - The next step continues with the existing visible workflow context.

This preserves the intent of fresh context while keeping the visible Pi conversation in one session.

### `clearOnStart`

Keep the existing session-based behavior.

Starting a workflow happens from `/workflow start`, which is an extension command handler and has command context. `ctx.newSession()` is available and safe there.

Expected semantics:

- `clearOnStart` omitted or `true`: keep using `ctx.newSession()`.
- `clearOnStart: false`: keep sending kickoff in the current session.

No boundary-system change is required for `clearOnStart`.

### `clearOnCompletion`

Keep the existing session-based behavior when command context is available.

Expected semantics for manual `/next` completing the final step:

- `clearOnCompletion` omitted or `true`: keep using `ctx.newSession()` for the completion notification.
- `clearOnCompletion: false`: report completion in the current session.

Known limitation for auto-next on the final step:

- If the final step has `autoNext: true`, completion is triggered from `agent_end`, which does not provide `ctx.newSession()`.
- Therefore, auto-next completion cannot automatically clear the session context when `clearOnCompletion` is true.
- Implement a graceful fallback: complete workflow, run cleanup, clear active workflow state, and notify in the current session.
- Document this limitation in README and/or tests.

This limitation is acceptable for now.

## Context Boundary Design

### Concept

A Workflower context boundary is a session entry id stored in active workflow state. During Pi's `context` event, Workflower filters the messages sent to the LLM so that entries at or before the boundary are excluded.

Example:

```text
A ─ B ─ C ─ D ─ E
        ^
        contextBoundaryEntryId = C
```

The LLM should see only messages derived from entries after `C`:

```text
D ─ E
```

The session file and TUI history remain unchanged. Only the model context is filtered.

### State field

Extend `ActiveWorkflowState` with an optional field:

```ts
contextBoundaryEntryId?: string | null;
```

Recommended semantics:

- `undefined` / absent: no Workflower context filtering.
- `null`: no Workflower context filtering.
- string: exclude branch entries up to and including the entry with that id.

The active workflow state is stored at:

```text
.pi/tmp/workflows/active.json
```

### When to set the boundary

On step advancement only:

- Determine the completed step: `workflow.steps[state.currentStepIndex]`.
- If `completedStep?.clearOnNext !== false`, set `contextBoundaryEntryId` to `ctx.sessionManager.getLeafId()` before sending the next kickoff prompt.
- If `completedStep?.clearOnNext === false`, carry forward the previous `contextBoundaryEntryId` unchanged.

Important detail:

- Capture the boundary before sending the next kickoff prompt.
- This ensures the next kickoff prompt itself is included in model context.

### Context filtering hook

Register a Pi `context` hook in `registerWorkflowCommand(pi)`.

High-level behavior:

1. Resolve the active state path from `ctx.cwd`.
2. Try to read active workflow state.
3. If no active state or no `contextBoundaryEntryId`, continue without changes.
4. Get the current session branch:

```ts
const branch = ctx.sessionManager.getBranch();
```

5. Find the boundary entry in the branch.
6. If the boundary is not found, continue without changes. Do not fail the agent turn.
7. Build model messages from entries after the boundary.
8. Return `{ messages }`.

Recommended implementation shape:

```ts
pi.on("context", async (_event, ctx) => {
  const state = await readActiveWorkflowState(...).catch(() => undefined);
  const boundaryId = state?.contextBoundaryEntryId;
  if (!boundaryId) return;

  const branch = ctx.sessionManager.getBranch();
  const boundaryIndex = branch.findIndex((entry) => entry.id === boundaryId);
  if (boundaryIndex < 0) return;

  const scopedEntries = branch.slice(boundaryIndex + 1);
  const { messages } = buildSessionContext(scopedEntries);
  return { messages };
});
```

`buildSessionContext` is exported by Pi:

```ts
import { buildSessionContext } from "@mariozechner/pi-coding-agent";
```

or use `@earendil-works/pi-coding-agent` depending on current package import conventions. Existing Workflower code currently imports Pi types from `@mariozechner/pi-coding-agent`; follow local style unless package config indicates otherwise.

### Why not mutate session history?

Do not try to delete or rewrite Pi session entries.

Pi sessions are append-only JSONL trees. Extension contexts expose `ctx.sessionManager` as a read-only manager. Supported mutation paths are command-only operations like `newSession`, `fork`, `navigateTree`, and append APIs exposed through Pi helpers. Direct session-file surgery would be brittle and could desynchronize Pi's in-memory state.

Filtering in the `context` hook is the supported extension-level way to affect what the model sees.

## Advancement Refactor

### Problem with current `advanceWorkflow`

Current `advanceWorkflow(ctx, currentSession?)` assumes a command-capable context because it can call `ctx.newSession()` for both step advancement and completion.

Auto-next from `agent_end` does not have command context.

### Recommended refactor

Introduce a shared advancement function that can operate in two modes:

1. Command/manual mode: has command context and can use `ctx.newSession()` for completion.
2. Event/auto-next mode: has normal extension context and cannot use `ctx.newSession()`.

Keep the public `advanceWorkflow` export intact if possible, but make it delegate to the shared implementation.

Potential type structure:

```ts
type WorkflowAdvanceContext = {
  cwd: string;
  ui: { notify(message: string, level?: "info" | "warning" | "error"): void };
  sessionManager?: { getLeafId(): string | null };
  newSession?: WorkflowCommandContext["newSession"];
};

type PromptSender = {
  sendUserMessage(prompt: string): Promise<void> | void;
};

type AdvanceWorkflowOptions = {
  currentSession?: PromptSender;
  allowSessionReplacementOnCompletion?: boolean;
};
```

Or keep separate functions:

```ts
export async function advanceWorkflow(
  ctx: WorkflowCommandContext,
  currentSession?: CurrentSessionPromptSender,
): Promise<void>;

export async function advanceWorkflowInCurrentSession(
  ctx: WorkflowEventContext,
  currentSession: CurrentSessionPromptSender,
): Promise<void>;
```

The exact shape is less important than preserving these properties:

- Manual `/next` and auto-next use the same state transition logic.
- Step advancement no longer requires `ctx.newSession()`.
- Completion can still use `ctx.newSession()` when available and configured.
- Auto-next completion gracefully falls back to current-session notification.

### Step advancement behavior

For a non-final next step:

1. Read active state.
2. Find workflow.
3. Compute `nextStepIndex`.
4. Compute kickoff prompt.
5. Determine whether to update `contextBoundaryEntryId`:
   - If previous/completed step `clearOnNext !== false` and `ctx.sessionManager?.getLeafId` exists, set boundary to current leaf id.
   - If no session manager is available, do not throw; notify warning only if useful.
6. Write updated active state, including `currentStepIndex`, `updatedAt`, and boundary.
7. Send next kickoff prompt via current-session sender.
8. Notify success.

There should be no `ctx.newSession()` call for non-final step advancement.

### Completion behavior

For final-step completion:

1. Delete active state.
2. If `cleanupOnCompletion !== false`, remove workflow workdir.
3. If `workflow.clearOnCompletion === false`, notify in current session.
4. Else if command context has `ctx.newSession()` and session replacement is allowed, use existing `ctx.newSession()` completion notification behavior.
5. Else notify in current session, possibly with a message noting completion happened without session clearing due to auto-next/event context.

Recommended user-facing message for fallback should be concise. Example:

```text
Workflow <id> complete. Completion ran from auto-next, so session context was not cleared automatically.
```

Avoid noisy warnings on normal successful paths.

## Register Hook Changes

### Current auto-next handler

Current code in `register.ts`:

```ts
pi.on("agent_end", async (_event, ctx) => {
  const activeStatePath = resolveWorkflowPaths(ctx.cwd, "", "").activeStatePath;

  let state: ActiveWorkflowState;
  try {
    state = await readActiveWorkflowState(activeStatePath);
  } catch {
    return;
  }

  const currentStep = findWorkflow(state.workflowId)?.steps[state.currentStepIndex];
  if (currentStep?.autoNext !== true) return;

  pi.sendUserMessage("/next", { deliverAs: "followUp" });
});
```

### Desired auto-next handler

Replace the final send with direct advancement.

Recommended shape:

```ts
pi.on("agent_end", async (_event, ctx) => {
  const state = await readActiveWorkflowState(...).catch(() => undefined);
  if (!state) return;

  const currentStep = findWorkflow(state.workflowId)?.steps[state.currentStepIndex];
  if (currentStep?.autoNext !== true) return;

  await advanceWorkflowFromAutoNext(ctx, {
    sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
  });
});
```

Important: the next kickoff prompt should be sent as a follow-up user message after the current agent run completes. Because this prompt is not a slash command, `pi.sendUserMessage()` is appropriate here.

### Add context hook

Add to `registerWorkflowCommand(pi)`:

```ts
pi.on("context", async (_event, ctx) => {
  // Apply Workflower boundary filtering.
});
```

This hook should be independent of auto-next. It applies to both manual and auto-next advancement whenever active state has a boundary.

## State Schema / Backward Compatibility

Existing active state files will not have `contextBoundaryEntryId`. Treat absence as no boundary.

No migration file is required.

If TypeScript state parsing currently trusts JSON shape without runtime validation, simply adding an optional field is enough.

If tests compare exact state objects, update them to either include the optional field where relevant or not require it where absent.

## README / Docs Updates

Update `packages/workflower/README.md` to reflect new semantics.

### Sections to update

- `Advance to the next step`
- `Register workflows from another package`
- `clearOnNext` description
- `autoNext` description
- Completion behavior / gotchas

### Suggested wording

For `clearOnNext`:

```md
`clearOnNext` is optional and defaults to `true`. It is evaluated on the step being completed. When true or omitted, Workflower sets a model-context boundary before sending the next kickoff prompt, so the next step only sees conversation after that boundary. The Pi session history remains visible in the same session. When `clearOnNext: false`, Workflower keeps the existing boundary, allowing the next step to see prior workflow-step context.
```

For auto-next limitation:

```md
When `autoNext` completes the final step, Workflower runs completion and cleanup from Pi's `agent_end` event. Pi does not expose session replacement APIs in that event, so `clearOnCompletion: true` cannot create a fresh session for final-step auto-next completion. Workflower reports completion in the current session in that case.
```

For `/next`:

Remove or revise language that says `/next` opens a fresh Pi session by default for step transitions. It should now say that it sets a context boundary by default.

## Tests to Add / Update

Work in `packages/workflower/tests/workflower.test.ts`.

### Update existing auto-next test

Current test expects:

```ts
expect(pi.sentUserMessages).toEqual([{ prompt: "/next", options: { deliverAs: "followUp" } }]);
```

Replace with assertions that:

- Active workflow state advances to next step.
- A follow-up kickoff prompt for the next step is sent.
- No literal `/next` is sent.
- `contextBoundaryEntryId` is set when `clearOnNext` is omitted/true.

### Add test: auto-next honors `clearOnNext: false`

Workflow:

```ts
steps: [
  { id: "first", command: "/first", autoNext: true, clearOnNext: false },
  { id: "second", command: "/second" },
]
```

Expected:

- Auto-next advances to step 1.
- State does not get a new `contextBoundaryEntryId`.
- Existing boundary, if any, is preserved.

### Add test: manual `/next` sets boundary instead of new session

Setup active state at step 0. Use command context with `newSession: vi.fn()` and session manager leaf id.

Expected:

- `/next` advances to step 1.
- `newSession` is not called for non-final step advancement.
- Prompt is sent through current session sender.
- State includes `contextBoundaryEntryId` equal to the leaf id.

### Add test: context hook filters messages after boundary

Register extension with harness. Prepare active state with a boundary id. Provide a fake `ctx.sessionManager.getBranch()` returning entries like:

```text
entry-a user old
entry-b assistant old
entry-c boundary
entry-d user kickoff
entry-e assistant response
```

Invoke `pi.handlers.context[0](event, ctx)`.

Expected:

- Returned `messages` include entries after boundary only.
- Old pre-boundary messages are excluded.

If harness currently lacks `context` handler support, extend it similarly to `agent_end`.

### Add test: context hook does nothing when boundary absent

Expected:

- Handler returns `undefined` or `{ action: continue }` equivalent (for `context`, likely `undefined`).
- No error.

### Add test: auto-next final-step completion fallback

Workflow with one final step:

```ts
steps: [{ id: "only", command: "/only", autoNext: true }]
```

Expected after `agent_end`:

- Active state is deleted.
- Workdir is cleaned up by default.
- No `newSession` is attempted.
- Completion notification is in current session.

### Preserve existing completion tests

Manual `/next` completion should still use `ctx.newSession()` when `clearOnCompletion` is omitted/true.

Manual completion with `clearOnCompletion: false` should still notify in current session.

### Harness updates

Existing helper types near the bottom of `workflower.test.ts` likely need changes:

- `createPiHarness()` currently tracks `handlers.agent_end` and `sentUserMessages`.
- Add support for `handlers.context`.
- Add `sessionManager.getLeafId()` and/or `getBranch()` to command/event contexts as needed.

Do not overbuild the harness; keep test-only additions minimal.

## Potential Implementation Details

### Type imports

Current Workflower imports Pi types from:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
```

If importing `buildSessionContext`, either use the same package specifier for consistency:

```ts
import { buildSessionContext, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
```

or split type/value imports if lint prefers:

```ts
import { buildSessionContext, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
```

Verify package exports and TypeScript resolution.

### Avoid stale command context after session replacement

Since step-to-step advancement no longer uses `ctx.newSession()`, this risk is reduced.

Still preserve existing safe usage for:

- `startWorkflow()` with `ctx.newSession()`.
- Manual final completion with `ctx.newSession()`.

Do not use captured old `pi` or old command context inside `newSession({ withSession })` callbacks; use the replacement context passed to `withSession`.

### Boundary and compaction interaction

The simplest implementation builds context from `branch.slice(boundaryIndex + 1)`.

This should be acceptable initially. If compaction entries occur after the boundary, `buildSessionContext` should handle them. If a compaction before the boundary summarizes old context, it will be excluded because it is before the boundary.

### Boundary not found

If the boundary id is not found on the active branch, do not throw. Return without modifying context.

Possible causes:

- User navigated the session tree.
- Session was compacted/branched unexpectedly.
- State was manually edited.

Fail-open is safer than breaking agent operation.

## Acceptance Criteria

Implementation is complete when:

1. `autoNext` never queues literal `/next` via `pi.sendUserMessage()`.
2. Auto-next advances workflow state directly.
3. Manual `/next` and auto-next share the same state transition logic.
4. Non-final step advancement does not call `ctx.newSession()`.
5. `clearOnNext` true/omitted sets a context boundary.
6. `clearOnNext: false` preserves existing boundary and includes prior workflow context.
7. A `context` hook filters LLM context after the stored boundary.
8. `clearOnStart` remains session-based.
9. Manual `clearOnCompletion` remains session-based.
10. Final-step auto-next completion gracefully falls back to current-session completion notification.
11. README describes the new boundary behavior and final auto-next limitation.
12. Package-local validation passes:

```bash
cd packages/workflower
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Non-goals

Do not implement these as part of this update:

- New Pi APIs for queued command execution.
- Direct session JSONL mutation/deletion.
- Multiple active workflows.
- Artifact validation.
- TUI workflow controls.
- New workflow DSL.
- Changes outside Workflower unless required by tests or package exports.

## Suggested Commit/PR Summary

```text
Fix Workflower auto-next with context-boundary clearing

- Replace auto-next literal /next queuing with direct workflow advancement
- Reinterpret clearOnNext as a model-context boundary instead of session replacement
- Add context hook to filter LLM messages after active workflow boundary
- Keep clearOnStart and manual clearOnCompletion session-based
- Document final-step auto-next completion clearing limitation
```
