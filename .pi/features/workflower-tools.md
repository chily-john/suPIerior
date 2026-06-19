# Workflower Handoff Tool

## Goal

Add one generic Pi tool named `workflower_handoff` to `@supierior/workflower` so an agent can start another registered Workflower workflow from inside an active workflow step.

This is needed for branch and loop workflows. A skill can follow instructions, read artifacts, compare state, and call tools, but it cannot reliably execute extension slash commands by printing `/wf:<id>` in assistant text. Slash commands are parsed from user/RPC/extension input, not from assistant output. A real tool gives the model an executable action.

Do **not** add `callableBy`, `visibility`, `helper`, or per-workflow tool registration in this iteration. The tool should be able to hand off to any registered workflow by id.

## User-facing behavior

A skill can call:

```json
{
  "workflowId": "counter-loop"
}
```

through the `workflower_handoff` tool.

The tool should:

1. require an active workflow in the current Pi session;
2. find the registered target workflow by `workflowId`;
3. mark the currently active flower as `handedOff`;
4. create the target workflow as the next flower in the same garden;
5. pass the previous flower's indexed pollen paths into the new workflow kickoff prompt;
6. queue the new kickoff prompt as a follow-up user message;
7. return a useful tool result to the model;
8. prevent the current turn's `autoNext` handler from advancing the newly started workflow immediately.

The tool should **not** accept a garden name. Initial workflow starts remain slash-command driven:

```text
/wf:<workflow-id> <garden-name>
```

The handoff tool is only for continuing an existing garden.

## Why a generic tool instead of one tool per workflow?

Use one generic tool:

```text
workflower_handoff
```

with a `workflowId` parameter.

Reasons:

- keeps the model tool list small as workflow count grows;
- avoids registering/unregistering many workflow-specific tools;
- avoids tool-name collisions from workflow ids;
- centralizes handoff validation and active-state behavior;
- supports future branch workflows where a step chooses one of several registered workflow ids.

Workflow-specific tools can be added later as aliases if the model struggles with string workflow ids, but this iteration should start with the generic primitive.

## Important auto-next detail

This is the easy-to-miss part.

The handoff tool will normally be called during an agent turn. If it immediately writes active state for the target workflow, then the existing `agent_end` auto-next handler may run after that same agent turn and see the **new** active workflow. If the new workflow's first step has `autoNext: true`, Workflower could advance the target workflow before its kickoff prompt has actually run.

That must not happen.

When `workflower_handoff` succeeds, mark the current session as having performed a handoff during this agent turn. The next `agent_end` auto-next check for that session should consume that marker and return without advancing anything.

This marker should be short-lived and session-scoped.

## Files to add

### 1. `packages/workflower/extension-src/workflower/internals/pi-adapter/tools/register-handoff-tool.ts`

Create a new Pi adapter module that registers the tool.

Suggested shape:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { applyWorkflowStepRuntimeSettings } from "@pi-adapter/apply-workflow-step-runtime-settings";
import { handoffWorkflowById } from "@orchestration/runtime/use-cases/handoff/handoff-workflow-by-id";
import { markHandoffDuringTurn } from "../workflow-handoff-turn-guard";

export function registerHandoffTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "workflower_handoff",
    label: "Workflower Handoff",
    description: "Hand off the active Workflower garden to another registered workflow.",
    promptSnippet: "Hand off the active Workflower garden to another registered workflow by id.",
    promptGuidelines: [
      "Use workflower_handoff when a Workflower step must continue by starting another workflow in the active garden.",
      "Do not print /wf commands when a workflow handoff is required; call workflower_handoff instead.",
    ],
    parameters: Type.Object({
      workflowId: Type.String({
        description: "Registered workflow id to start as the next flower in the active garden.",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = await handoffWorkflowById(params.workflowId, ctx, {
        applyStepRuntimeSettings: (step) => applyWorkflowStepRuntimeSettings(pi, ctx, step),
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
      });

      if (!result.ok) {
        return {
          content: [{ type: "text", text: result.message }],
          details: result,
        };
      }

      markHandoffDuringTurn(ctx.cwd, ctx.sessionManager.getSessionId());

      return {
        content: [{ type: "text", text: result.message }],
        details: result,
      };
    },
  });
}
```

Notes for implementation:

- The exact import for `Type` depends on current project dependencies. Pi docs use `import { Type } from "typebox";`.
- If `packages/workflower` does not already have `typebox`, add it to `packages/workflower/package.json` dependencies.
- Keep this file in `pi-adapter` because it uses Pi APIs.
- Do not import `pi-adapter` from orchestration files.

### 2. `packages/workflower/extension-src/workflower/internals/pi-adapter/workflow-handoff-turn-guard.ts`

Create a tiny session-scoped guard shared by the tool and auto-next event handler.

Suggested API:

```ts
const handoffSessions = new Set<string>();

export function markHandoffDuringTurn(cwd: string, sessionId: string): void {
  handoffSessions.add(key(cwd, sessionId));
}

export function hasHandoffDuringTurn(cwd: string, sessionId: string): boolean {
  return handoffSessions.has(key(cwd, sessionId));
}

export function consumeHandoffDuringTurn(cwd: string, sessionId: string): boolean {
  const sessionKey = key(cwd, sessionId);
  const hadHandoff = handoffSessions.has(sessionKey);
  handoffSessions.delete(sessionKey);
  return hadHandoff;
}

function key(cwd: string, sessionId: string): string {
  return `${cwd}\0${sessionId}`;
}
```

Use `hasHandoffDuringTurn` inside the tool before starting a second handoff in the same turn. Use `consumeHandoffDuringTurn` in the auto-next event.

### 3. `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/handoff/handoff-workflow-by-id.ts`

Create a runtime use case that performs the handoff by workflow id and returns a structured result instead of only notifying UI.

Suggested return types:

```ts
export type WorkflowHandoffSuccess = {
  ok: true;
  message: string;
  workflowId: string;
  gardenName: string;
  gardenPath: string;
  activeFlowerName: string;
  activeFlowerPath: string;
  workdir: string;
  incomingPollen: string[];
};

export type WorkflowHandoffFailure = {
  ok: false;
  message: string;
};

export type WorkflowHandoffUseCaseResult = WorkflowHandoffSuccess | WorkflowHandoffFailure;
```

Suggested function signature:

```ts
export async function handoffWorkflowById(
  workflowId: string,
  ctx: WorkflowCommandContext,
  currentSession: CurrentSessionPromptSender,
): Promise<WorkflowHandoffUseCaseResult>;
```

Implementation steps:

1. Resolve active-state path using:
   - `resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId())`
2. Read active state using `readActiveWorkflowState`.
   - If missing/unreadable, return failure:
     ```text
     No active Workflower workflow. workflower_handoff can only be used inside an active garden.
     ```
3. Find target workflow using `findWorkflow(workflowId)`.
   - If not found, return failure:
     ```text
     Unknown workflow id: <id>
     ```
4. Compute the new workflow's start boundary:
   - same logic as `start-workflow.ts`:
     ```ts
     const startBoundaryEntryId =
       workflow.clearOnStart === false ? undefined : (ctx.sessionManager.getLeafId?.() ?? undefined);
     ```
5. Call existing `handoffWorkflowInSession(workflow, activeState, ctx, startBoundaryEntryId)`.
   - If it returns `undefined`, return a failure message.
6. Call `startWorkflowStep(workflow, result.state, 0, currentSession, { incomingPollen: result.incomingPollen })`.
   - This renders the target workflow kickoff prompt with incoming pollen paths.
   - The `currentSession.sendUserMessage` implementation from the tool should queue it with `{ deliverAs: "followUp" }`.
7. If sending fails, return failure.
8. Return success with paths and a clear message.

Do not duplicate the low-level flower creation logic. Reuse `handoffWorkflowInSession` so slash-command handoffs and tool handoffs stay consistent.

## Files to change

### 1. `packages/workflower/extension-src/workflower/internals/pi-adapter/register-extension.ts`

Register the new tool when the Workflower extension loads.

Add import:

```ts
import { registerHandoffTool } from "./tools/register-handoff-tool";
```

Call it inside `registerExtension(pi)` after the duplicate-API guard and before or near command registration:

```ts
registerHandoffTool(pi);
```

The exact order is not critical, but putting tool registration near command registration keeps Pi adapter setup readable.

### 2. `packages/workflower/extension-src/workflower/internals/pi-adapter/events/auto-next-on-agent-end.ts`

Update the `agent_end` handler so successful handoffs suppress the next auto-next pass.

Current behavior:

```ts
pi.on("agent_end", async (_event, ctx) => {
  await advanceOnAutoNext(ctx, {
    applyStepRuntimeSettings: (step) => applyWorkflowStepRuntimeSettings(pi, ctx, step),
    sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
  });
});
```

Desired behavior:

```ts
import { consumeHandoffDuringTurn } from "../workflow-handoff-turn-guard";

pi.on("agent_end", async (_event, ctx) => {
  if (consumeHandoffDuringTurn(ctx.cwd, ctx.sessionManager.getSessionId())) return;

  await advanceOnAutoNext(ctx, {
    applyStepRuntimeSettings: (step) => applyWorkflowStepRuntimeSettings(pi, ctx, step),
    sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
  });
});
```

This prevents the first step of the newly handed-off workflow from being auto-advanced before its kickoff prompt runs.

### 3. `packages/workflower/package.json`

If the tool schema uses `Type` from `typebox`, add:

```json
"dependencies": {
  "typebox": "*"
}
```

If another schema helper is already available through Pi's public API at implementation time, use that instead and avoid adding a dependency. The implementation must pass `pnpm --filter @supierior/workflower typecheck`.

### 4. `packages/feature-workflow/extension-src/feature-workflow/internals/skills/counter-start-loop/SKILL.md`

After the Workflower tool exists, update this skill to call the tool instead of printing `/wf:counter-loop`.

Current intent to replace:

```text
Start the next flower in the current garden by issuing /wf:counter-loop.
```

Desired instruction:

```text
Call the workflower_handoff tool with workflowId "counter-loop". Do not print or send /wf:counter-loop as text.
```

Frontmatter should include the tool if skills require explicit tool allowlisting:

```yaml
allowed-tools: read workflower_handoff
```

### 5. `packages/feature-workflow/extension-src/feature-workflow/internals/skills/counter-continue/SKILL.md`

Update the continue-loop skill the same way.

When `current < end`, it should call:

```json
{
  "workflowId": "counter-loop"
}
```

through `workflower_handoff`.

When `current >= end`, it should not call the tool. It should report completion and allow the workflow to complete normally through auto-next.

Frontmatter should include:

```yaml
allowed-tools: read workflower_handoff
```

## Tests to create or update

Most tests belong in:

```text
packages/workflower/tests/workflower.test.ts
```

The existing test file already exercises command registration, starts, handoffs, auto-next, pollen, cleanup, and session behavior. Add focused tests there unless it becomes too large, in which case create:

```text
packages/workflower/tests/workflower-tools.test.ts
```

If creating a new test file, copy the harness style from `workflower.test.ts`.

### Test harness updates

The existing `createPiHarness()` in `packages/workflower/tests/workflower.test.ts` does not currently model tools. Update it to capture registered tools:

```ts
function createPiHarness(): {
  commands: Record<string, any>;
  tools: Record<string, any>;
  registeredCommands: string[];
  registeredTools: string[];
  // existing fields...
  registerTool: (tool: any) => void;
} {
  return {
    commands: {},
    tools: {},
    registeredCommands: [],
    registeredTools: [],
    // existing fields...
    registerTool(tool) {
      this.registeredTools.push(tool.name);
      this.tools[tool.name] = tool;
    },
  };
}
```

Keep existing fields and methods unchanged.

### Workflower tests

#### 1. Registers `workflower_handoff`

Add a package smoke or Pi adapter test:

```ts
it("registers the workflower_handoff tool", async () => {
  const { default: registerWorkflower } = await loadWorkflower();
  const pi = createPiHarness();

  registerWorkflower(pi);

  expect(pi.tools.workflower_handoff).toBeDefined();
  expect(pi.tools.workflower_handoff.description).toMatch(/Hand off/);
});
```

#### 2. Tool fails when no active workflow exists

Scenario:

1. Register Workflower extension.
2. Call `pi.tools.workflower_handoff.execute(...)` with `{ workflowId: "feature" }`.
3. Use a command/tool context with no active state file.
4. Assert result is failure text and no user message was queued.

Expected:

- result details: `{ ok: false, ... }`
- message includes `No active Workflower workflow`
- `pi.sentUserMessages` remains empty

#### 3. Tool fails for unknown workflow id

Scenario:

1. Start an initial workflow through existing command helper.
2. Call the tool with `{ workflowId: "missing-workflow" }`.
3. Assert failure.

Expected:

- message includes `Unknown workflow id: missing-workflow`
- active state still points at the original workflow
- no new flower directory was created

#### 4. Tool starts target workflow as next flower in same garden

Scenario:

1. Register a target workflow, for example:

   ```ts
   registerWorkflow({
     id: "handoff-target",
     steps: [{ id: "target-step", command: "/target", outputs: ["target.md"] }],
   });
   ```

2. Start `feature` with `/wf:feature demo`.
3. Complete or set pollen for the active flower if needed.
4. Call `workflower_handoff` with `{ workflowId: "handoff-target" }`.
5. Assert active state now points at `handoff-target`.
6. Assert garden name stayed `demo`.
7. Assert active flower path ends with `0002-handoff-target`.
8. Assert previous flower `index.json` has status `handedOff`.
9. Assert target flower `index.json` has status `active`.
10. Assert a follow-up kickoff prompt was queued.

Expected prompt details:

- contains `Workflow: handoff-target`
- contains `Current step 0: target-step`
- uses the new target workdir
- if incoming pollen exists, contains `Incoming pollen paths:` and the previous pollen path

#### 5. Tool passes previous pollen into target kickoff prompt

This can be combined with test 4, but a dedicated test is clearer.

Scenario:

1. Register source workflow with pinned pollen:

   ```ts
   registerWorkflow({
     id: "handoff-source-pollen",
     pollen: "state.json",
     steps: [
       { id: "make-state", command: "/make", outputs: ["state.json"] },
       { id: "decide", command: "/decide" },
     ],
   });
   ```

2. Register target workflow.
3. Start source.
4. Advance once so `state.json` is pinned as pollen. Workflower does not validate that the file exists, so the test can rely on output metadata.
5. Call handoff tool.
6. Assert target kickoff prompt includes the absolute `state.json` path from the source flower.

#### 6. Tool queues kickoff prompt as `followUp`

Because the tool is normally called during an agent turn, the new workflow kickoff should be queued as follow-up.

Assert:

```ts
expect(pi.sentUserMessages.at(-1)?.options).toEqual({ deliverAs: "followUp" });
```

#### 7. Handoff suppresses next auto-next pass

This is required for loops.

Scenario:

1. Register source workflow with an auto-next handoff step:

   ```ts
   registerWorkflow({
     id: "auto-handoff-source",
     steps: [{ id: "handoff", command: "/skill:handoff", autoNext: true }],
   });
   ```

2. Register target workflow whose first step also has `autoNext: true`:

   ```ts
   registerWorkflow({
     id: "auto-handoff-target",
     steps: [
       { id: "first", command: "/target-first", autoNext: true },
       { id: "second", command: "/target-second" },
     ],
   });
   ```

3. Start source.
4. Call `workflower_handoff` to target.
5. Manually invoke the registered `agent_end` handler from the harness.
6. Read active state.

Expected:

- active workflow is still `auto-handoff-target`
- `currentStepIndex` is still `0`
- no prompt for target step 1 / `second` was queued by auto-next

Without the guard, this test would fail by advancing to step 1.

#### 8. Allows normal auto-next when no handoff happened

Add or preserve a regression test showing existing auto-next behavior still works when no handoff marker exists.

Scenario:

1. Start a workflow with step 0 `autoNext: true`.
2. Invoke `agent_end` without calling `workflower_handoff`.
3. Assert active state advances to step 1.

This ensures the new guard only suppresses auto-next after a tool handoff.

#### 9. Prevents two handoffs in the same agent turn

Scenario:

1. Start a source workflow.
2. Call `workflower_handoff` to `target-a`.
3. Before invoking `agent_end`, call `workflower_handoff` again to `target-b`.

Expected:

- second call fails with a clear message like:
  ```text
  A Workflower handoff already occurred during this agent turn.
  ```
- active workflow remains `target-a`

This avoids accidentally handing off from a just-created target flower before the target kickoff prompt has run.

### Feature workflow tests

Update:

```text
packages/feature-workflow/tests/feature-workflow.test.ts
```

Expected changes:

1. The counter workflow definitions likely remain the same.
2. Update assertions only if skill frontmatter/content snapshots are added in future.
3. Add a lightweight test if desired that reads the two handoff-capable skill files and asserts they mention `workflower_handoff` instead of `/wf:counter-loop`.

Suggested optional test:

```ts
it("counter handoff skills instruct the agent to call workflower_handoff", async () => {
  const startLoop = await readFile(
    new URL(
      "../extension-src/feature-workflow/internals/skills/counter-start-loop/SKILL.md",
      import.meta.url,
    ),
    "utf8",
  );
  const continueLoop = await readFile(
    new URL(
      "../extension-src/feature-workflow/internals/skills/counter-continue/SKILL.md",
      import.meta.url,
    ),
    "utf8",
  );

  expect(startLoop).toContain("workflower_handoff");
  expect(continueLoop).toContain("workflower_handoff");
});
```

## Documentation updates

### `packages/workflower/README.md`

Add a section after command surface or handoff docs:

```md
## Agent handoffs

Workflower registers a model-callable tool named `workflower_handoff`. A workflow step skill can call this tool to start another registered workflow as the next flower in the current garden.

The tool requires an active workflow and accepts:

```json
{ "workflowId": "next-workflow" }
```

It marks the current flower as `handedOff`, creates the next flower in the same garden, and includes the previous flower's pollen paths in the target kickoff prompt.
```

Also mention that assistant text containing `/wf:<id>` does not execute the slash command; skills should call `workflower_handoff` for autonomous branching or looping.

### `packages/feature-workflow/README.md`

Update the counter workflow section to say that loop continuation uses `workflower_handoff`, not slash-command text.

## Acceptance criteria

Implementation is done when all of these are true:

- `@supierior/workflower` registers a `workflower_handoff` tool.
- The tool can hand off from an active workflow to any registered workflow id.
- The tool fails clearly when no workflow is active.
- The tool fails clearly for unknown workflow ids.
- Handoff-created kickoff prompts include incoming pollen paths from the previous flower.
- Handoff-created kickoff prompts are queued as follow-up messages.
- Previous flower index status becomes `handedOff`.
- New flower index status is `active`.
- Active state points at the new target workflow after handoff.
- Auto-next is skipped once after a successful handoff tool call.
- Normal auto-next behavior still works when no handoff occurred.
- Counter handoff skills call `workflower_handoff` instead of printing `/wf:counter-loop`.

## Validation commands

Run from the repository root:

```bash
pnpm --filter @supierior/workflower test
pnpm --filter @supierior/workflower typecheck
pnpm --filter @supierior/workflower lint
pnpm --filter @supierior/workflower build
pnpm --filter @supierior/feature-workflow test
pnpm --filter @supierior/feature-workflow typecheck
pnpm --filter @supierior/feature-workflow lint
pnpm --filter @supierior/feature-workflow build
```

## Out of scope for this iteration

Do not implement these yet:

- `callableBy`, `visibility`, `helper`, or `utility` workflow metadata;
- hiding workflows from slash-command registration;
- per-workflow handoff tools;
- explicit pollen override parameters;
- handoff reason fields;
- multi-target handoff in a single step;
- starting initial workflows from the tool without an active garden.
