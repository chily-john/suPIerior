# @supierior/workflower

Workflower is a Pi package for running named, multi-step workflows with configurable context boundaries while persisting lightweight session-scoped workflow state on disk.

## Command surface

Workflower registers:

- `/wf:<workflow-id>` commands for registered workflows where `userInvocable !== false`.
- `/wf` for active workflow lifecycle helpers.
- `/next` to advance the active workflow to the next step.

Workflow command names are created automatically from registered workflow ids. For example, a workflow with id `feature` is started with:

```text
/wf:feature <garden-name>
```

Namespaced workflow ids can use underscores or hyphens:

```text
/wf:github_issue <garden-name>
/wf:review-pr <garden-name>
```

Workflow ids must match `^[a-z0-9_-]+$`: lowercase ASCII letters, digits, underscores, and hyphens only. Exact duplicate workflow ids are rejected during registration because they would create the same `/wf:<id>` command.

Workflow definitions are user-invokable by default. Set `userInvocable: false` to prevent Workflower from registering `/wf:<workflow-id>` for humans; the hidden command will not appear in Pi command listings or slash autocomplete, and exact typed `/wf:<workflow-id>` input is blocked with a friendly error.

## Workflow prompt display

When Workflower starts a workflow or advances to a step, it sends the model a full kickoff prompt but shows only a compact label in chat, such as `Workflow: feature — demo-garden` or `Step: discover`. The compact display keeps long generated prompts readable in the transcript. It is not a token-saving feature: the full kickoff prompt still enters model context and still counts like normal context.

If a step uses a Workflower private skill, that private skill may be expanded into the full prompt without showing its Markdown body in the visible transcript. Do not assume private skill injection failed just because the private skill text is not visible in chat; check workflow behavior, expected outputs, or tests instead.

Assistant messages that print `/wf:<id>`, `/next`, or other slash commands do not execute those commands. Autonomous workflow movement should use model-callable tools such as `workflower_handoff`, or deterministic router tools that call Workflower runtime APIs, instead of asking the assistant to print slash commands.

## Agent handoffs

Workflower registers a model-callable tool named `workflower_handoff`. A workflow step skill can call this tool to start another registered workflow as the next flower in the current garden.

The tool requires an active workflow and accepts:

```json
{ "workflowId": "next-workflow" }
```

It marks the current flower as `handedOff`, creates the next flower in the same garden, and includes the previous flower's pollen paths in the target kickoff prompt. Assistant text containing `/wf:<id>` does not execute a slash command; skills should call `workflower_handoff` for autonomous branching or looping.

Workflow definitions are model-invokable by default. Hidden user commands (`userInvocable: false`) remain valid `workflower_handoff` targets unless the workflow also sets `modelInvocable: false`.

## Garden state

Garden state is a small JSON state file shared by every flower in one active garden. It is for structured facts that later workflow steps or deterministic router code need after Workflower clears model context.

```text
.workflower/workflows/<garden-name>/state.json
```

The file is created lazily when the first key is written, uses this shape, and is preserved on completion when the active workflow sets `cleanupOnCompletion: false`:

```json
{
  "version": 1,
  "values": {
    "review.rating": {
      "value": 4,
      "updatedAt": "2026-06-15T18:30:00.000Z"
    }
  }
}
```

`/wf stop` only clears the current session's active workflow pointer; it does not delete `.workflower/workflows/<garden-name>/state.json` or flower artifacts. State keys are flat strings like `review.rating`, `feature_summary`, or `tests-passed`; dots are naming convention only. Keys must match `^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$` and cannot be `__proto__`, `constructor`, or `prototype`.

Use garden state for small facts such as ratings, summaries, booleans, ids, or routing decisions. Use step outputs for large reports, logs, diffs, implementation plans, or review documents. Use pollen to pass selected output file paths from one flower to the next during handoff.

## State tools for agents

Workflower registers these model-callable tools:

- `workflower_state_set` — write a JSON-compatible value for the active garden.
- `workflower_state_get` — read one active-garden state key.
- `workflower_state_list` — list active-garden state keys.

Examples:

```json
{ "key": "review.rating", "value": 3 }
{ "key": "review.summary", "value": "Needs more tests." }
{ "key": "review.required_changes", "value": ["Add empty-input tests"] }
```

Agents should call these tools when workflow instructions name state keys. They should not store large artifacts in state, and should call `workflower_handoff` rather than printing `/wf:<id>` when autonomous handoff is required.

## State commands for humans

Use `/wf clean <garden-name>` to remove an inactive preserved garden when you are done inspecting it. The command refuses to delete a garden that still has an active workflow in any tracked Pi session.

Use `/wf state` to inspect or repair the active garden state manually:

```text
/wf state list
/wf state get review.rating
/wf state set review.rating 4
/wf state set review.summary "Needs more tests"
/wf state set review.required_changes ["Add edge-case tests","Handle missing active workflow"]
```

For `set`, everything after the key is parsed as JSON. Strings must be quoted.

## Extension runtime API

Extension authors can use the same underlying operations without invoking tools or slash commands:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createWorkflowerRuntime } from "@supierior/workflower";

export default function reviewRouter(pi: ExtensionAPI): void {
  pi.registerCommand("review-route", {
    description: "Route the active Workflower garden based on review.rating.",
    handler: async (_args, ctx) => {
      const wf = createWorkflowerRuntime(pi, ctx);
      const rating = await wf.state.getValue("review.rating");
      if (typeof rating !== "number")
        return ctx.ui.notify("review.rating must be a number.", "error");

      const nextWorkflow = rating >= 4 ? "feature-next-steps" : "implementation-review-loop";
      const result = await wf.handoff(nextWorkflow);
      if (!result.ok) ctx.ui.notify(result.message, "error");
    },
  });
}
```

`createWorkflowerRuntime(pi, ctx)` is a lightweight facade for the current command/tool handler. Do not cache it globally or reuse it across sessions. In tools, pass `sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" })` so handoff kickoff prompts are delivered safely during an agent turn.

## Deterministic review routing example

A reviewer step can write:

```json
{ "key": "review.rating", "value": 3 }
```

Then deterministic extension code can route:

```ts
const rating = await wf.state.getValue("review.rating");
const nextWorkflow = rating >= 4 ? "feature-next-steps" : "implementation-review-loop";
await wf.handoff(nextWorkflow);
```

For fully autonomous routing, expose the router as a model-callable tool as well as, or instead of, a human command.

## Outputs vs pollen vs garden state

- Outputs are durable files produced by workflow steps in the active flower workdir. Use them for large artifacts: plans, reviews, diffs, logs, and reports.
- Pollen is selected output file paths recorded in a flower index and passed to the next flower during handoff. Use it when the next workflow needs to find a previous file.
- Garden state is small structured JSON shared by all flowers in one active garden. Use it for facts such as `review.rating`, `review.summary`, feature ids, flags, and deterministic routing inputs.

## Slash command limitation

Workflower step kickoff prompts can tell an agent to run `/review-route`, but assistant text cannot execute slash commands; printed slash commands are just assistant text. Human-triggered deterministic routing works well as a command. Fully autonomous routing should expose deterministic code as a model-callable tool and have that tool call `createWorkflowerRuntime(pi, ctx, { sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }) })` before handoff.

## Start a workflow

```text
/wf:<workflow-id> <garden-name>
```

For example:

```text
/wf:custom-demo my-workflow
```

### Workflow pipelines

You can queue a simple linear workflow pipeline when starting a garden:

```text
/wf:<workflow-id> <garden-name> | <workflow-id> [| <workflow-id>...]
```

For an active workflow handoff, omit the garden name and put queued downstream workflows after the pipe:

```text
/wf:<next-workflow-id> | <queued-workflow-id>
```

The pipe is Workflower command syntax, not shell syntax: it does not run processes, connect standard streams, or support shell quoting. The first segment starts or hands off to the named workflow, and each queued segment becomes the next flower after the prior workflow reaches its final step.

All queued workflow targets must be user-invocable. Queued pipeline segments are workflow ids only; they cannot include arguments, per-target garden names, or additional syntax. Final cleanup runs only after the last workflow in the pipeline completes, so earlier flowers remain available for pollen and handoff context until the pipeline is done.

Starting a new garden:

1. looks up the registered workflow by id;
2. creates the first flower at `.workflower/workflows/<garden-name>/0001-<workflow-id>/index.json`;
3. records a context boundary in the current Pi session unless the workflow sets `clearOnStart: false`;
4. writes durable active state for the current Pi session to `.workflower/tmp/workflows/active/<session-id>.json`; and
5. sends the step-0 kickoff prompt inside the current session.

`clearOnStart: false` preserves prior conversation context for the first step of a new garden by disabling the start boundary. With the default start boundary, Workflower keeps the visible session but filters pre-start messages from model context through `contextBoundaryEntryId`.

`<garden-name>` is required when no workflow is active and must be a safe path segment because it becomes part of the workflow artifact path. The initial flower path is `.workflower/workflows/<garden-name>/0001-<workflow-id>/`; there is no garden-level index file. Missing arguments, extra arguments, unknown workflow ids, unsafe names, and duplicate initial flowers are reported with friendly error messages.

When a workflow is already active in the current Pi session, start the next flower by running another workflow command with no arguments:

```text
/wf:<next-workflow-id>
```

Workflower marks the previous flower index as `handedOff`, leaves that flower's files in place, creates the next numbered flower in the same garden such as `.workflower/workflows/<garden-name>/0002-<next-workflow-id>/`, writes a fresh active index for the new flower, and sends the new workflow's step-0 kickoff prompt. Passing a garden name while active is invalid because the current garden is already established.

Handoffs do not apply the target workflow's `clearOnStart`; that setting only affects starting the first flower in a new garden. Handoff isolation comes from the already-active workflow's step boundaries: for a tool-driven handoff step, set `clearOnNext` on the step that advances into that handoff step; for a manual `/wf:<next>` handoff, set `clearOnNext` on the just-completed source step before running the handoff.

## Inspect or stop active workflow state

```text
/wf status
/wf stop
/wf list
/wf resume <garden-name>
/wf resume <garden-name> --step <step-id|index>
```

When no workflow is active in the current Pi session, `/wf status` reports that there is no active workflow. When a workflow is active, status shows the workflow id, garden, garden path, active flower path, and current step id/command. If the saved active state references a workflow id that is no longer registered, status reports that mismatch as a warning while still showing the garden and active flower path.

`/wf stop` clears the current session's `.workflower/tmp/workflows/active/<session-id>.json` state and reports which workflow and garden were stopped. It does not delete garden state or flower artifacts under `.workflower/workflows/<garden-name>/`, and it leaves the garden resumable with `/wf resume <garden-name>` when resume metadata is present. Users can inspect, reuse, or remove those files manually with `/wf clean <garden-name>`.

`/wf list` shows all session-scoped active workflow states in the repo by workflow, garden, and active flower path, and marks entries outside the current Pi session as `stale/other session` so abandoned sessions are visible without automatically adopting them.

Use `/wf resume <garden-name>` to restore a stopped or otherwise inactive garden from `.workflower/workflows/<garden-name>/resume.json`. Resume refuses to run when the current session already has an active workflow, when another tracked session still owns the garden, when the saved metadata belongs to a completed garden, or when the workflow definition or active flower metadata cannot be validated. Completed gardens are refused.

Use `/wf resume <garden-name> --step <step-id|index>` only to correct the active step pointer before resuming. Numeric step overrides are zero-based. The `--step` option is a pointer override only: it does not prune future flowers, does not rewind artifacts, and does not mutate garden state. Pass `--step` and its value as separate arguments; `--step=<value>` is not supported.

Older gardens without `resume.json` cannot be resumed by this first implementation. Workflower refuses those gardens rather than migrating or repairing them automatically.

## Advance to the next step

```text
/next
```

Workflower advances by explicit user intent in the current Pi session. After you complete and manually verify a step's declared outputs, type `/next`; no workflow id or name is required. If `/next` receives any arguments, Workflower reports `Usage: /next` and does not advance state.

A step can set `autoNext: true` to advance directly after an agent run completes while that step is active. Auto-next uses the same internal advancement behavior as manual `/next`, including `clearOnNext`, final-step completion, completion cleanup, and chained auto-next steps. It does not queue a literal `/next` message.

Workflower intentionally advances blindly by user intent. It does not check whether output files exist, validate artifacts, or parse prompt text for state. Non-final advancement keeps the visible session and clears model context through `contextBoundaryEntryId` unless `clearOnNext: false`.

Each successful `/next` records pollen in the active flower's `index.json` from the completed step's declared `outputs`. Pollen entries are absolute paths resolved inside the active flower folder. If the workflow does not set `pollen`, each completed step with outputs replaces unpinned pollen. If the workflow sets `pollen` to a string or string array, completing a step whose outputs include one of those configured paths pins pollen: string pollen writes that one absolute path, and array pollen writes all configured absolute paths together. Once `pollenPinned` is `true`, later step outputs do not replace it. Workflower does not check that pollen or output files exist.

During a handoff, the new workflow's kickoff prompt lists the previous flower's indexed pollen paths when the new workflow accepts pollen. Set `acceptPollen: false` on a workflow definition to omit incoming pollen from handoff kickoff prompts. Pollen files are referenced by path only and are not copied into the new flower.

When `/next` advances beyond the final step of the active flower, Workflower completes the whole garden: it marks the active flower index as `completed`, clears the current session's active state, applies each flower's producing workflow `cleanupOnCompletion` setting, removes garden state unless the active workflow sets `cleanupOnCompletion: false`, removes the garden directory if cleanup leaves it empty, and reports workflow completion. Handoffs do not clean up previous flowers; cleanup waits until final garden completion. A workflow can preserve its flower artifacts and completion garden state with `cleanupOnCompletion: false`, and the active workflow can keep completion in the current session with `clearOnCompletion: false`.

## Runtime settings

A workflow or workflow step can set `model` to a Pi model reference in `provider/model-id` format. Use Pi's `/models` command to discover the available provider and model id pairs. Workflow-level settings apply to every step unless a step declares its own setting.

```ts
{
  id: "first",
  command: "/my-first-step",
  model: "openai-codex/gpt-5.3-codex-spark",
}
```

`model` can also be an ordered fallback list. Item 0 is preferred; later items are tried when the earlier candidate is missing or cannot be selected. If none can be selected, Workflower leaves Pi on the current/default model and still starts the step.

```ts
model: [
  "openai-codex/gpt-5.3-codex-spark",
  "openai/gpt-5.3-codex-spark",
  "azure-openai-responses/gpt-5.3-codex-spark",
],
```

TypeScript users get a template-literal type requiring the `provider/model-id` shape plus provider-prefix suggestions for common built-in Pi providers. Full model ids remain runtime-discovered because Pi can load custom models and providers.

A workflow or workflow step can also set `thinkingLevel` to `"off"`, `"minimal"`, `"low"`, `"medium"`, `"high"`, or `"xhigh"`.

Runtime settings are resolved for each step start, so step-level overrides affect only that step. Model candidates are tried in this order: step `model`, workflow `model`, then the model that was active when the garden started. Thinking level resolves as `step.thinkingLevel ?? workflow.thinkingLevel ?? starting thinking level`. If no model candidate can be selected, Workflower leaves Pi on the current/default model and still starts the step.

## Register workflows from another package

Workflower exposes a small workflow-authoring API from the package root. A separate package can contribute a workflow by importing `registerWorkflow` from `@supierior/workflower` during extension startup:

```ts
import { registerWorkflow } from "@supierior/workflower";
import type { WorkflowDefinition } from "@supierior/workflower";

const myWorkflow: WorkflowDefinition = {
  id: "custom-demo",
  userInvocable: true,
  modelInvocable: true,
  clearOnStart: false,
  clearOnCompletion: false,
  cleanupOnCompletion: false,
  model: "openai-codex/gpt-5.3-codex-spark",
  thinkingLevel: "medium",
  pollen: "second.md",
  acceptPollen: true,
  steps: [
    {
      id: "first",
      command: "/my-first-step",
      outputs: ["first.md"],
      thinkingLevel: "high",
      clearOnNext: false,
      autoNext: true,
    },
    { id: "second", command: "/my-second-step", outputs: ["second.md"] },
  ],
};

export default function myPackageExtension(): void {
  registerWorkflow(myWorkflow);
}
```

After registration, Workflower automatically exposes the start command unless `userInvocable: false` is set:

```text
/wf:custom-demo <garden-name>
```

The Pi extension entry points at Workflower's public ESM module (`./dist/index.mjs`), and the registry is stored on `globalThis`, so command handlers and external package imports share the same in-process registry even when extension bundles load separately. Workflower registers `/wf:<workflow-id>` commands for user-invokable workflows already present when the extension loads and for user-invokable workflows contributed later in the same process.

Workflower does not ship workflows itself; it provides the registration and command runtime for workflow packages, published workflow collections, or local workflow extensions.

If you want Pi to create a workflow package for you, install the standalone `@supierior/workflower-authoring` skill package. That authoring package does not load the Workflower runtime; generated workflow packages depend on Workflower internally.

## State and artifacts

- Runtime root: `.workflower/`
- Garden state: `.workflower/workflows/<garden-name>/state.json`
- Active flower workdir: `.workflower/workflows/<garden-name>/<sequence>-<workflow-id>/`
- Flower index: `.workflower/workflows/<garden-name>/<sequence>-<workflow-id>/index.json`
- Active session state: `.workflower/tmp/workflows/active/<session-id>.json`
- Resume metadata: `.workflower/workflows/<garden-name>/resume.json`

Workflower automatically creates `.workflower/.gitignore` with `*` when it writes runtime state or artifacts so workflow run data stays untracked by default.

The flower index stores `status`, `workflowId`, `flowerPath`, `pollen`, and `pollenPinned`. Active state stores `sessionId`, optional `sessionFile`, `id`, `name`, `gardenName`, `gardenPath`, `activeFlowerName`, `activeFlowerPath`, `workdir`, `currentStepIndex`, optional `contextBoundaryEntryId`, optional captured `runtimeDefaults`, `startedAt`, and `updatedAt`.

Workflow artifacts and garden state are not deleted by `/wf stop`. Handoffs preserve earlier flowers in the garden and share one garden state file. At final `/next` completion, Workflower deletes garden state unless the active workflow sets `cleanupOnCompletion: false`, evaluates each flower's `workflowId`, looks up that workflow definition, deletes flower artifacts by default, preserves flowers whose producing workflow sets `cleanupOnCompletion: false`, and removes the garden directory only when it becomes empty.

## Development and validation

From this package:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
