# Workflower Garden State and Runtime API

## Goal

Add a simple, garden-scoped JSON state system to Workflower and expose the same underlying Workflower operations to **agents**, **humans**, and **extension code**.

This feature is intentionally small in runtime behavior but important architecturally:

- Agents need reliable tools for reading and writing workflow state after context-clearing boundaries.
- Humans need clear files and commands for inspecting what a workflow believes is true.
- Extension authors need a code API for deterministic routing, especially loops such as implementation → review → route → re-implement or continue.

The target API should make this kind of extension command or tool possible:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createWorkflowerRuntime } from "@supierior/workflower";

export default function reviewRouter(pi: ExtensionAPI): void {
  pi.registerCommand("review-route", {
    description: "Route the active Workflower garden based on review.rating.",
    handler: async (_args, ctx) => {
      const wf = createWorkflowerRuntime(pi, ctx);

      const rating = await wf.state.getValue("review.rating");
      if (!isRating(rating)) {
        ctx.ui.notify("review.rating must be a number from 1 through 5.", "error");
        return;
      }

      const nextWorkflow = rating >= 4 ? "feature-next-steps" : "implementation-review-loop";
      const result = await wf.handoff(nextWorkflow);

      if (!result.ok) ctx.ui.notify(result.message, "error");
    },
  });
}

function isRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}
```

Important: `createWorkflowerRuntime(pi, ctx)` is a **lightweight facade bound to the current Pi command/tool context**. It must not create a second global Workflower runtime, and callers must not cache it across sessions. It simply packages existing Workflower operations with the current `cwd`, session id, UI, model settings, and kickoff-message sender.

---

## Current Workflower behavior to preserve

Workflower currently has these concepts:

```text
.pi/tmp/workflows/active/<session-id>.json
.pi/workflows/<garden-name>/<sequence>-<workflow-id>/index.json
.pi/workflows/<garden-name>/<sequence>-<workflow-id>/<step outputs>
```

- Active workflow state is session-scoped and stored in `.pi/tmp/workflows/active/<session-id>.json`.
- A garden is the temporary wrapper for one chained workflow run.
- A flower is one workflow execution inside that garden.
- Step outputs are files inside a flower folder.
- Pollen is selected output paths passed from one flower to the next.
- `workflower_handoff` is already a model-callable tool that delegates to the internal `handoffWorkflowById(...)` use case.
- Slash commands are not executable by assistant text. If the assistant prints `/wf:some-workflow`, Pi treats it as assistant text, not a command invocation.

The new state system should not replace outputs or pollen in this first phase. It should sit next to them:

- **Outputs**: durable files produced by workflow steps.
- **Pollen**: selected output paths passed during workflow handoff.
- **Garden state**: structured JSON values shared by all flowers in one active garden.

---

## User story: review loop

A common workflow loop looks like this:

1. An implementation workflow modifies code.
2. A reviewer workflow reviews the implementation.
3. The reviewer assigns a rating from `1` to `5`.
4. If the rating is `4` or `5`, the garden continues to the next workflow.
5. If the rating is below `4`, the garden loops back to implementation with the review feedback available.

The rating decision should be deterministic code, not a model guess.

The model can write this state:

```json
{
  "review.rating": 3,
  "review.summary": "The implementation is close, but it needs edge-case tests.",
  "review.required_changes": [
    "Add tests for empty input.",
    "Handle the no-active-workflow case without throwing."
  ]
}
```

Then extension code can route with a literal `if` statement:

```ts
const rating = await wf.state.getValue("review.rating");
const nextWorkflow = rating >= 4 ? "feature-next-steps" : "implementation-review-loop";
await wf.handoff(nextWorkflow);
```

This is the core reason the feature needs a public runtime API, not just agent tools.

---

## UX principle

Workflower operations should be implemented once and adapted into three surfaces:

1. **Agent tools**
   - `workflower_state_get`
   - `workflower_state_set`
   - `workflower_state_list`
   - existing `workflower_handoff`

2. **Human commands**
   - `/wf state list`
   - `/wf state get <key>`
   - `/wf state set <key> <json-value>`

3. **Extension-code API**
   - `createWorkflowerRuntime(pi, ctx)`
   - `wf.state.getValue(key)`
   - `wf.state.set(key, value)`
   - `wf.state.list()`
   - `wf.handoff(workflowId)`

Do not make commands call tools. Do not make tools call commands. Tools, commands, and extension code should call the same underlying use cases.

---

## Important UX limitation to document clearly

An extension command is excellent for **human-triggered deterministic routing**:

```text
/review-route
```

But Workflower does not currently execute step commands directly as code. A workflow step like this:

```ts
{
  id: "route-review",
  command: "/review-route",
  autoNext: true
}
```

currently results in a kickoff prompt that tells the agent to execute `/review-route`. The assistant cannot execute slash commands by printing them.

Therefore, for fully autonomous routing in this phase, workflow authors should expose the deterministic router as a **model-callable tool** as well as, or instead of, a human command:

```ts
pi.registerTool({
  name: "review_route",
  description: "Route the active garden based on review.rating.",
  async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
    const wf = createWorkflowerRuntime(pi, ctx, {
      sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
    });

    const result = await routeReview(wf, ctx.ui);
    return {
      content: [{ type: "text", text: result.message }],
      details: result,
    };
  },
});
```

This limitation should be included in the documentation so users do not assume that assistant text can invoke commands.

Future UX option, out of scope for this feature: first-class Workflower code/router steps that run deterministic code without involving a model tool call or human command.

---

## Garden state file

### Location

Use a single state file per garden:

```text
.pi/workflows/<garden-name>/state.json
```

This file is garden-scoped, not project-global and not flower-scoped.

### Lifecycle

- Created lazily when the first key is written.
- Shared by all flowers in the same garden.
- Deleted when the garden completes.
- Deleted on completion even if some flower artifacts are preserved with `cleanupOnCompletion: false`.
- Not deleted by `/wf stop`, because `/wf stop` currently stops the active session state without deleting workflow artifacts.

### Suggested JSON shape

```ts
export type GardenStateFile = {
  version: 1;
  values: Record<string, GardenStateEntry>;
};

export type GardenStateEntry = {
  value: JsonValue;
  updatedAt: string;
  producer?: GardenStateProducer;
};

export type GardenStateProducer = {
  workflowId: string;
  stepId?: string;
  stepIndex: number;
  gardenName: string;
  gardenPath: string;
  flowerName?: string;
  flowerPath: string;
};

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
```

Example:

```json
{
  "version": 1,
  "values": {
    "review.rating": {
      "value": 3,
      "updatedAt": "2026-06-15T18:30:00.000Z",
      "producer": {
        "workflowId": "implementation-review",
        "stepId": "review-implementation",
        "stepIndex": 0,
        "gardenName": "issue-123",
        "gardenPath": "C:/repo/.pi/workflows/issue-123",
        "flowerName": "0002-implementation-review",
        "flowerPath": "C:/repo/.pi/workflows/issue-123/0002-implementation-review"
      }
    }
  }
}
```

### Key validation

Keep key names simple and safe. Recommended rule:

```text
^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$
```

Allowed examples:

- `review.rating`
- `review.summary`
- `feature_summary`
- `tests-passed`
- `implementation.plan`

Rejected examples:

- empty string
- `/bad`
- `../bad`
- `has space`
- `review/rating`
- `__proto__`
- `constructor`
- `prototype`

The key is a flat string. Dots are only naming convention; they do not imply nested JSON patching in this phase.

---

## Proposed public runtime API

Export from the package root for now:

```ts
export { createWorkflowerRuntime } from "@package-api/create-workflower-runtime";
export type {
  WorkflowerRuntime,
  WorkflowerRuntimeOptions,
  GardenStateEntry,
  GardenStateListItem,
  GardenStateSetResult,
  GardenStateGetResult,
  GardenStateListResult,
  WorkflowHandoffUseCaseResult,
} from "...";
```

A subpath export such as `@supierior/workflower/runtime` can be added later, but the root export avoids package `exports` changes in the first implementation.

### Suggested facade shape

```ts
export type WorkflowerRuntime = {
  state: {
    get(key: string): Promise<GardenStateGetResult>;
    getValue(key: string): Promise<JsonValue | undefined>;
    set(key: string, value: JsonValue): Promise<GardenStateSetResult>;
    list(): Promise<GardenStateListResult>;
  };

  handoff(workflowId: string): Promise<WorkflowHandoffUseCaseResult>;
};

export type WorkflowerRuntimeOptions = {
  sendUserMessage?: (prompt: string) => Promise<void> | void;
};
```

Default `sendUserMessage` behavior:

- In command handlers, default to `pi.sendUserMessage(prompt)`.
- In tools, pass an override that uses `pi.sendUserMessage(prompt, { deliverAs: "followUp" })` because tools run during an agent turn.

Do not cache `WorkflowerRuntime` globally. It closes over the current command/tool context and therefore belongs to one handler call.

---

## Architecture notes

### Existing handoff internals

`workflower_handoff` currently delegates to:

```text
packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/handoff/handoff-workflow-by-id.ts
```

That internal use case already performs the important behavior:

1. reads active state for the current session;
2. validates the target workflow id;
3. creates the next flower in the same garden;
4. starts step 0 of the target workflow;
5. sends the kickoff prompt through a supplied `CurrentSessionPromptSender`;
6. returns a structured success/failure result.

The public runtime facade should wrap this use case instead of duplicating handoff logic.

### Dependency direction

Keep Pi-specific code out of orchestration foundations.

Recommended structure:

```text
packages/workflower/extension-src/workflower/
  package-api/
    create-workflower-runtime.ts
    garden-state.types.ts
    garden-state-public-results.ts

  internals/workflow-orchestration/runtime/garden-state/
    garden-state-paths.ts
    garden-state-store.ts
    garden-state-validation.ts

  internals/workflow-orchestration/runtime/use-cases/garden-state/
    get-garden-state-value.ts
    set-garden-state-value.ts
    list-garden-state-values.ts
    resolve-active-garden.ts

  internals/pi-adapter/tools/
    register-garden-state-tools.ts
```

Pi adapter files should call use cases or the public facade. Orchestration files should not import Pi adapter files.

Watch `packages/workflower/scripts/.dependency-cruiser.cjs`. If a new `runtime/garden-state` foundation folder is added, update the dependency rules so Pi adapter code does not import it directly. Pi adapter should import use cases instead.

### Runtime settings sharing

The public facade needs to preserve current handoff behavior, including model and thinking-level settings for the new workflow step.

Current commands/tools use:

```text
packages/workflower/extension-src/workflower/internals/pi-adapter/apply-workflow-step-runtime-settings.ts
```

Because `package-api` is not supposed to import from `internals/pi-adapter`, do not simply import that file into the public API.

Preferred options:

1. Move or extract the reusable runtime-setting adapter into a public/package API module, then have existing Pi adapter commands import from that shared module.
2. Or keep a tiny package-api helper that contains equivalent Pi-specific binding logic without importing `internals/pi-adapter`.

The first option is cleaner because it avoids duplicate model/thinking-level behavior.

---

## Agent tools

### `workflower_state_set`

Purpose: let the model write structured state values for the active garden.

Parameters:

```json
{
  "key": "review.rating",
  "value": 4
}
```

Behavior:

- Requires active Workflower state in the current Pi session.
- Validates the key.
- Validates that `value` is JSON-serializable.
- Writes `.pi/workflows/<garden>/state.json`.
- Adds producer metadata from active workflow state.
- Returns a concise text result and structured details.

Prompt guidelines:

- Use `workflower_state_set` to record small structured facts that later workflow steps or routing tools need.
- Do not use `workflower_state_set` for large logs, diffs, or long reports; write those as step outputs instead.
- Use agreed key names from the workflow instructions exactly.

### `workflower_state_get`

Parameters:

```json
{
  "key": "review.rating"
}
```

Behavior:

- Requires active garden.
- Validates key.
- Returns missing-key clearly; missing is not a tool error.
- Returns value and metadata in `details`.

### `workflower_state_list`

Parameters:

```json
{}
```

Behavior:

- Requires active garden.
- Returns all keys and metadata.
- Text output should be concise. Do not dump giant values into the tool text result.
- Structured `details` may include values, but consider truncation if values can be large.

---

## Human commands

Extend `/wf`:

```text
/wf state list
/wf state get <key>
/wf state set <key> <json-value>
```

Examples:

```text
/wf state list
/wf state get review.rating
/wf state set review.rating 4
/wf state set review.summary "Needs more tests"
/wf state set review.required_changes ["Add edge-case tests","Handle missing active workflow"]
```

Parsing rule for `set`:

- Everything after the key is parsed as JSON.
- If parsing fails, show an error with examples.
- Strings must be quoted because the value is JSON.

This is primarily for debugging and manual workflows. Extension code should use the runtime API directly.

---

## Documentation that must be created or updated

### Workflower README

Update `packages/workflower/README.md` with sections for:

1. Garden state concept.
2. State file path and lifecycle.
3. Agent tools.
4. Human `/wf state` commands.
5. Extension-code API with `createWorkflowerRuntime(pi, ctx)`.
6. Review-loop example.
7. Warning that assistant text cannot execute slash commands.
8. Guidance on outputs vs pollen vs garden state.

### Workflower authoring skill docs

Update:

```text
packages/workflower-authoring/skills/workflower-authoring/SKILL.md
```

Add guidance for workflow authors:

- Declare expected state keys in skill instructions.
- Tell agents exactly when to call `workflower_state_set`.
- Use code/router tools for deterministic branching.
- Do not rely on assistant text to invoke slash commands.

### Example workflow package docs

Update or add examples in `packages/feature-workflow` showing:

- a reviewer setting `review.rating`;
- a router command/tool reading `review.rating`;
- routing back to an implementation workflow or onward to the next workflow.

### Agent-facing instructions

The tool `promptGuidelines` should be explicit and self-contained. For example:

```text
Use workflower_state_set to save small structured facts for the active Workflower garden, such as review.rating or implementation.summary.
Use workflower_state_get to read previously saved active-garden facts when a workflow step depends on them.
Use workflower_handoff, not printed /wf commands, when an agent must continue the active garden in another workflow.
```

---

# Implementation issues

The issues below are written as vertical slices for a junior developer. Follow red/green TDD for each issue:

1. Add or update the smallest test that describes the desired behavior.
2. Run the test and confirm it fails for the expected reason.
3. Implement the smallest code change that makes it pass.
4. Refactor only while tests stay green.
5. Update docs in the same issue when user-facing behavior changes.

From `packages/workflower`, run these frequently:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

From the repo root, run broader validation before finalizing:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

---

## Issue 1: Add garden state storage foundations

### User story

As a Workflower user, I want each garden to have a simple JSON state file, so structured data can survive context clearing and be shared across all flowers in the garden.

### Vertical slice delivered

After this issue, internal code can read, write, and list state values in `.pi/workflows/<garden>/state.json` with tests. No Pi tool or command is required yet.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/artifact-paths.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/scripts/.dependency-cruiser.cjs`

### Files likely to add

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/garden-state/garden-state.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/garden-state/garden-state-paths.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/garden-state/garden-state-validation.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/garden-state/garden-state-store.ts`

### Red tests

Add tests that fail before implementation:

1. `resolveGardenStatePath(gardenPath)` returns `<gardenPath>/state.json`.
2. Writing the first state value creates `state.json` with `version: 1` and a `values` object.
3. Reading a missing state file returns an empty state, not an exception.
4. Setting a string value and reading it returns the same value.
5. Setting an object value and reading it returns the same object.
6. Listing state returns all keys sorted alphabetically.
7. Invalid keys are rejected:
   - `""`
   - `"../bad"`
   - `"review/rating"`
   - `"has space"`
   - `"__proto__"`
   - `"constructor"`
   - `"prototype"`
8. JSON-incompatible values are rejected if the TypeScript API can receive them, such as `undefined`, functions, symbols, `NaN`, or `Infinity`.

### Green implementation notes

- Keep all file operations in the garden-state store.
- Use `JSON.stringify(..., null, 2)` and write a trailing newline, matching existing Workflower JSON style.
- Use atomic-enough simple write behavior for this phase; no locking required.
- Do not mutate objects provided by callers.
- Keep key validation isolated in `garden-state-validation.ts`.

### Acceptance criteria

- State read/write/list behavior works in tests.
- Bad keys fail with an error message that includes `Invalid garden state key`.
- The state file is stable, pretty-printed JSON.
- No Pi adapter file imports the garden-state foundation directly if dependency rules are updated to forbid that.

### Out of scope

- No tools yet.
- No `/wf state` commands yet.
- No public runtime facade yet.
- No schema declarations on workflow definitions.

---

## Issue 2: Add active-garden state use cases

### User story

As a Workflower tool or extension command, I want to access state for the currently active garden without manually finding files, so all callers behave consistently.

### Vertical slice delivered

After this issue, code can call use cases with the current Pi context shape and read/write/list the active garden state.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/handoff/handoff-workflow-by-id.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/start.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-paths.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/workflow-runtime.types.ts`

### Files likely to add

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/garden-state/resolve-active-garden.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/garden-state/get-garden-state-value.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/garden-state/set-garden-state-value.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/garden-state/list-garden-state-values.ts`

### Suggested result types

```ts
export type GardenStateFailure = {
  ok: false;
  message: string;
};

export type GardenStateGetSuccess = {
  ok: true;
  key: string;
  found: boolean;
  entry?: GardenStateEntry;
};

export type GardenStateSetSuccess = {
  ok: true;
  key: string;
  entry: GardenStateEntry;
  message: string;
};

export type GardenStateListSuccess = {
  ok: true;
  values: Record<string, GardenStateEntry>;
  keys: string[];
};
```

### Red tests

Add tests that fail before implementation:

1. With no active workflow state for the session, `get` returns `{ ok: false }` with a friendly message.
2. With active state containing `gardenPath`, `set` writes to that garden's `state.json`.
3. If active state lacks `gardenPath`, the use case falls back safely to `dirname(activeState.workdir)` or equivalent current behavior.
4. `set` records producer metadata from active workflow state:
   - `workflowId`
   - `stepIndex`
   - current step id if the workflow definition is registered and the step exists
   - `gardenName`
   - `gardenPath`
   - `flowerName`
   - `flowerPath`
5. `get` returns missing keys as `{ ok: true, found: false }`.
6. `list` returns an empty list for a garden with no state file.

### Green implementation notes

- Reuse `resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId())`.
- Reuse `readActiveWorkflowState(...)`.
- Use `findWorkflow(activeState.id)` only for optional producer step id. Do not fail state writes just because the workflow definition is unavailable unless there is already a project convention requiring that.
- Return structured failures instead of throwing for normal user errors.

### Acceptance criteria

- Active-garden state operations do not require callers to know paths.
- No-active-workflow cases are friendly and structured.
- Producer metadata is present for successful writes.
- Tests cover active state with modern garden fields and fallback fields.

---

## Issue 3: Expose `createWorkflowerRuntime(pi, ctx)` and handoff facade

### User story

As an extension author, I want a small public Workflower runtime facade bound to the current Pi handler context, so my commands and tools can read garden state and hand off workflows without invoking agent tools or slash commands.

### Vertical slice delivered

After this issue, extension code can import `createWorkflowerRuntime` from `@supierior/workflower` and use it in tests with a fake Pi/context.

### Files to inspect first

- `packages/workflower/extension-src/workflower/index.ts`
- `packages/workflower/extension-src/workflower/package-api/register-workflow.ts`
- `packages/workflower/extension-src/workflower/package-api/workflow-definition.types.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/handoff/handoff-workflow-by-id.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/apply-workflow-step-runtime-settings.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/tools/register-handoff-tool.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/scripts/.dependency-cruiser.cjs`

### Files likely to add

- `packages/workflower/extension-src/workflower/package-api/create-workflower-runtime.ts`
- possibly `packages/workflower/extension-src/workflower/package-api/workflower-runtime.types.ts`

### Red tests

Add tests that fail before implementation:

1. Public module exports `createWorkflowerRuntime`.
2. Public module exports the garden state result types as types only. Runtime tests should only check runtime values.
3. Creating a runtime with fake `pi` and fake command `ctx` does not write files or start workflows by itself.
4. `wf.state.set("review.rating", 4)` writes active garden state.
5. `wf.state.getValue("review.rating")` returns `4`.
6. `wf.state.getValue("missing.key")` returns `undefined`.
7. `wf.handoff("some-workflow")` delegates to the same handoff behavior as `workflower_handoff`:
   - marks previous flower handed off;
   - creates next flower;
   - writes active state;
   - sends the kickoff prompt through the facade's sender.
8. Passing a custom `sendUserMessage` option is honored. This is required for tools to use `{ deliverAs: "followUp" }`.

### Green implementation notes

- The facade should be a small object created per handler call.
- It should capture only the passed `pi`, `ctx`, and options.
- It should not register commands or tools.
- It should not store global mutable state.
- It should reuse the existing `handoffWorkflowById(...)` use case.
- It should reuse the new active-garden state use cases.

### Runtime settings caution

The handoff facade must preserve the behavior of existing Workflower commands/tools:

- apply workflow/step model settings;
- apply workflow/step thinking level;
- send the target step kickoff prompt.

Do not accidentally make public-code handoffs skip model/thinking settings.

### Acceptance criteria

- Extension authors can use the public API without importing from `internals/*`.
- Public API tests pass.
- Existing handoff tool behavior still passes.
- No dependency-cruiser rules are violated.

### Out of scope

- Do not add executable/router step definitions in this issue.
- Do not add global project state.

---

## Issue 4: Add garden state agent tools

### User story

As an agent running a Workflower step, I want clear tools to read and write active garden state, so I can preserve structured facts across context boundaries and handoffs.

### Vertical slice delivered

After this issue, the model can call `workflower_state_get`, `workflower_state_set`, and `workflower_state_list` during an active workflow.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/pi-adapter/register-extension.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/tools/register-handoff-tool.ts`
- `packages/workflower/extension-src/workflower/internals/pi-adapter/workflow-handoff-turn-guard.ts`
- `packages/workflower/tests/workflower.test.ts`
- `packages/workflower/package.json`

### Files likely to add

- `packages/workflower/extension-src/workflower/internals/pi-adapter/tools/register-garden-state-tools.ts`

### Red tests

Add tests that fail before implementation:

1. Workflower extension registers all three tools.
2. Tool descriptions mention active garden state.
3. Tool prompt guidelines name each tool explicitly.
4. `workflower_state_set` with no active workflow returns `ok: false` in `details` and a useful text message.
5. `workflower_state_set` during an active workflow writes `state.json`.
6. `workflower_state_get` returns the value set by `workflower_state_set`.
7. `workflower_state_list` returns keys without requiring file inspection.
8. Invalid keys return structured failure details.

### Green implementation notes

- Use `Type.Object(...)` from `typebox`, matching the existing handoff tool.
- Use `Type.Any()` or the project's supported TypeBox equivalent for arbitrary JSON values.
- Return both:
  - `content: [{ type: "text", text: ... }]`
  - `details: result`
- Keep text concise. Large values should not flood tool text output.
- Internally use `createWorkflowerRuntime(pi, ctx, { sendUserMessage: ... })` or the same active-state use cases. Prefer the public facade if it is available.

### Acceptance criteria

- Tools are visible in Workflower extension registration tests.
- Tools work with fake Pi harness tests.
- Tool result details are stable and useful for agents.
- Tool prompt guidelines clearly explain when to use state vs outputs.

---

## Issue 5: Add human `/wf state` commands

### User story

As a human user debugging a workflow, I want to inspect and edit active garden state from `/wf`, so I can understand and repair workflow routing without manually opening JSON files.

### Vertical slice delivered

After this issue, `/wf state list`, `/wf state get <key>`, and `/wf state set <key> <json-value>` work against the active garden.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/pi-adapter/commands/wf-command.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/manage-active/show-status.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/manage-active/list-active.ts`
- `packages/workflower/tests/workflower.test.ts`

### Red tests

Add tests that fail before implementation:

1. `/wf state list` with no active workflow notifies a friendly error.
2. `/wf state list` with no state file reports no keys.
3. `/wf state set review.rating 4` writes number `4`, not string `"4"`.
4. `/wf state set review.summary "Needs tests"` writes a string.
5. `/wf state set review.required_changes ["Add tests"]` writes an array.
6. `/wf state set review.rating not-json` reports a JSON parsing error with usage examples.
7. `/wf state get review.rating` displays the value.
8. `/wf state get missing.key` reports that the key is not set.

### Green implementation notes

- Keep `/wf` parsing simple and explicit.
- The first token after `state` is the state subcommand.
- For `set`, split once after the key and parse the remaining string as JSON.
- Notify through `ctx.ui.notify`.
- Use shared use cases or `createWorkflowerRuntime(pi, ctx)`.

### Acceptance criteria

- Human commands do not duplicate JSON file logic.
- Human errors are friendly and actionable.
- Existing `/wf status`, `/wf stop`, and `/wf list` still work.

---

## Issue 6: Delete garden state on workflow completion

### User story

As a Workflower user, I want garden state to be temporary, so completed gardens do not leave stale routing state behind.

### Vertical slice delivered

After this issue, final workflow completion deletes `.pi/workflows/<garden>/state.json`.

### Files to inspect first

- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/complete-workflow.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/remove-artifacts.ts`
- `packages/workflower/extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/flower-index-store.ts`
- `packages/workflower/tests/workflower.test.ts`

### Red tests

Add tests that fail before implementation:

1. Start a workflow garden.
2. Write `state.json`.
3. Advance beyond the final step.
4. Assert `state.json` no longer exists.
5. Repeat with a workflow that sets `cleanupOnCompletion: false`; assert flower artifacts may remain but `state.json` is still deleted.
6. Assert `/wf stop` does not delete `state.json`.

### Green implementation notes

- Add a small helper such as `removeGardenStateFile(gardenPath)`.
- Call it during final completion after active state is cleared and before trying to remove the empty garden directory.
- Missing state file should not be an error.
- Do not delete any files outside `.pi/workflows`.

### Acceptance criteria

- Garden state is deleted on completion.
- Completion cleanup still removes empty garden directories when appropriate.
- Preserved flower artifacts remain preserved when `cleanupOnCompletion: false`.
- `/wf stop` remains non-destructive.

---

## Issue 7: Update docs and add review-loop authoring guidance

### User story

As a new Workflower user or junior workflow author, I want clear documentation and examples, so I know when to use state, outputs, pollen, handoff, commands, and tools.

### Vertical slice delivered

After this issue, a new user can read the docs and build a basic implementation-review loop without reading Workflower internals.

### Files to inspect first

- `packages/workflower/README.md`
- `packages/workflower-authoring/skills/workflower-authoring/SKILL.md`
- `packages/feature-workflow/README.md`
- `packages/feature-workflow/extension-src/feature-workflow/package-api/counter-loop-workflow.ts`
- `packages/feature-workflow/extension-src/feature-workflow/package-api/take-it-away-workflow.ts`
- `.pi/features/workflower-tools.md`
- `.pi/features/workflower-garden-flower-workflow-management.md`

### Docs to write

#### Workflower README

Add sections:

1. `Garden state`
2. `State tools for agents`
3. `State commands for humans`
4. `Extension runtime API`
5. `Deterministic review routing example`
6. `Outputs vs pollen vs garden state`
7. `Slash command limitation`

#### Workflower authoring skill

Add instructions:

- For each workflow step, list expected state keys.
- Tell the agent exactly which keys to set.
- Prefer deterministic router tools/commands for branching.
- Use `workflower_handoff`, not printed slash commands, for autonomous handoff.
- Use output files for large artifacts.

#### Example review-loop docs

Include a full example:

1. Reviewer skill calls `workflower_state_set`:

   ```json
   { "key": "review.rating", "value": 3 }
   ```

2. Reviewer skill calls `workflower_state_set` for summary and required changes.
3. Router tool or human command reads the rating.
4. Router calls `wf.handoff("implementation-review-loop")` or `wf.handoff("feature-next-steps")`.

### Red tests

Add documentation tests if the package already uses them, or add simple assertions if appropriate:

1. README contains `createWorkflowerRuntime`.
2. README contains `workflower_state_set`.
3. README warns that assistant text cannot execute slash commands.
4. Authoring skill mentions garden state and deterministic routing.

### Green implementation notes

- Keep docs practical and example-driven.
- Write for a junior developer.
- Avoid assuming users know Workflower internals.
- Include copy-pasteable snippets.

### Acceptance criteria

- Docs explain all three audiences: agents, humans, and extension authors.
- Docs explain lifecycle and cleanup.
- Docs explain the review-loop scenario.
- Docs clearly warn about command execution limitations.

---

## Open UX questions before implementation

These do not block the first implementation, but they should be decided or documented before shipping broadly.

### 1. Should autonomous router workflows use custom tools or future code steps?

For now, autonomous routing should use a model-callable tool that runs deterministic code. Human/manual routing can use a command.

Future possibility: add Workflower step kind support:

```ts
type WorkflowStep =
  | { id: string; command: string; ... }
  | { id: string; run: WorkflowerStepRunner; ... };
```

This is out of scope for this feature.

### 2. Should state values be included in kickoff prompts?

Initial answer: no. Kickoff prompts may list available state keys later, but should not inject all values by default. Agents should use `workflower_state_get` when needed.

### 3. Should workflows declare state reads/writes?

Initial answer: not in phase 1. Later, workflow definitions could add:

```ts
stateReads?: string[];
stateWrites?: string[];
```

This would improve docs, validation, and prompt generation.

### 4. Should state support patch/merge/unset?

Initial answer: no. Use simple set/get/list. Add patch/unset only after real workflow usage proves the need.

### 5. Should state be project-global?

Initial answer: no. State is garden-scoped and deleted on completion. Project-global state risks stale hidden coupling between unrelated workflows.

---

## Final acceptance criteria for the whole feature

The feature is complete when:

1. Active gardens have a stable `state.json` file when state is written.
2. State is readable/writable/listable through shared use cases.
3. `createWorkflowerRuntime(pi, ctx)` is exported from `@supierior/workflower`.
4. Extension commands can route by reading state and calling `wf.handoff(...)`.
5. Agent tools can read/write/list state.
6. Human `/wf state` commands can inspect and edit state.
7. Garden state is deleted on final workflow completion.
8. Existing output, pollen, handoff, auto-next, and cleanup behavior remains intact.
9. Docs clearly explain usage for agents, humans, and extension authors.
10. Tests are written red-first and all package validation commands pass.
