# @supierior/workflower

Workflower is a Pi package for running named, multi-step workflows with configurable context boundaries while persisting lightweight session-scoped workflow state on disk.

## Command surface

Workflower registers:

- `/wf:<workflow-id>` commands for every registered workflow.
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

## Agent handoffs

Workflower registers a model-callable tool named `workflower_handoff`. A workflow step skill can call this tool to start another registered workflow as the next flower in the current garden.

The tool requires an active workflow and accepts:

```json
{ "workflowId": "next-workflow" }
```

It marks the current flower as `handedOff`, creates the next flower in the same garden, and includes the previous flower's pollen paths in the target kickoff prompt. Assistant text containing `/wf:<id>` does not execute a slash command; skills should call `workflower_handoff` for autonomous branching or looping.

## Start a workflow

```text
/wf:<workflow-id> <garden-name>
```

For example:

```text
/wf:custom-demo my-workflow
```

Starting a new garden:

1. looks up the registered workflow by id;
2. creates the first flower at `.pi/workflows/<garden-name>/0001-<workflow-id>/index.json`;
3. records a context boundary in the current Pi session unless the workflow sets `clearOnStart: false`;
4. writes durable active state for the current Pi session to `.pi/tmp/workflows/active/<session-id>.json`; and
5. sends the step-0 kickoff prompt inside the current session.

`clearOnStart: false` preserves prior conversation context for the first step of a new garden by disabling the start boundary. With the default start boundary, Workflower keeps the visible session but filters pre-start messages from model context through `contextBoundaryEntryId`.

`<garden-name>` is required when no workflow is active and must be a safe path segment because it becomes part of the workflow artifact path. The initial flower path is `.pi/workflows/<garden-name>/0001-<workflow-id>/`; there is no garden-level index file. Missing arguments, extra arguments, unknown workflow ids, unsafe names, and duplicate initial flowers are reported with friendly error messages.

When a workflow is already active in the current Pi session, start the next flower by running another workflow command with no arguments:

```text
/wf:<next-workflow-id>
```

Workflower marks the previous flower index as `handedOff`, leaves that flower's files in place, creates the next numbered flower in the same garden such as `.pi/workflows/<garden-name>/0002-<next-workflow-id>/`, writes a fresh active index for the new flower, and sends the new workflow's step-0 kickoff prompt. Passing a garden name while active is invalid because the current garden is already established.

Handoffs do not apply the target workflow's `clearOnStart`; that setting only affects starting the first flower in a new garden. Handoff isolation comes from the already-active workflow's step boundaries: for a tool-driven handoff step, set `clearOnNext` on the step that advances into that handoff step; for a manual `/wf:<next>` handoff, set `clearOnNext` on the just-completed source step before running the handoff.

## Inspect or stop active workflow state

```text
/wf status
/wf stop
/wf list
```

When no workflow is active in the current Pi session, `/wf status` reports that there is no active workflow. When a workflow is active, status shows the workflow id, garden, garden path, active flower path, and current step id/command. If the saved active state references a workflow id that is no longer registered, status reports that mismatch as a warning while still showing the garden and active flower path.

`/wf stop` clears the current session's `.pi/tmp/workflows/active/<session-id>.json` state and reports which workflow and garden were stopped. It does not delete garden or flower artifacts under `.pi/workflows/<garden-name>/<sequence>-<workflow-id>/`; users can inspect, reuse, or remove those files manually.

`/wf list` shows all session-scoped active workflow states in the repo by workflow, garden, and active flower path, and marks entries outside the current Pi session as `stale/other session` so abandoned sessions are visible without automatically adopting them.

## Advance to the next step

```text
/next
```

Workflower advances by explicit user intent in the current Pi session. After you complete and manually verify a step's declared outputs, type `/next`; no workflow id or name is required. If `/next` receives any arguments, Workflower reports `Usage: /next` and does not advance state.

A step can set `autoNext: true` to advance directly after an agent run completes while that step is active. Auto-next uses the same internal advancement behavior as manual `/next`, including `clearOnNext`, final-step completion, completion cleanup, and chained auto-next steps. It does not queue a literal `/next` message.

Workflower intentionally advances blindly by user intent. It does not check whether output files exist, validate artifacts, or parse prompt text for state. Non-final advancement keeps the visible session and clears model context through `contextBoundaryEntryId` unless `clearOnNext: false`.

Each successful `/next` records pollen in the active flower's `index.json` from the completed step's declared `outputs`. Pollen entries are absolute paths resolved inside the active flower folder. If the workflow does not set `pollen`, each completed step with outputs replaces unpinned pollen. If the workflow sets `pollen` to a string or string array, completing a step whose outputs include one of those configured paths pins pollen: string pollen writes that one absolute path, and array pollen writes all configured absolute paths together. Once `pollenPinned` is `true`, later step outputs do not replace it. Workflower does not check that pollen or output files exist.

During a handoff, the new workflow's kickoff prompt lists the previous flower's indexed pollen paths when the new workflow accepts pollen. Set `acceptPollen: false` on a workflow definition to omit incoming pollen from handoff kickoff prompts. Pollen files are referenced by path only and are not copied into the new flower.

When `/next` advances beyond the final step of the active flower, Workflower completes the whole garden: it marks the active flower index as `completed`, clears the current session's active state, applies each flower's producing workflow `cleanupOnCompletion` setting, removes the garden directory if cleanup leaves it empty, and reports workflow completion. Handoffs do not clean up previous flowers; cleanup waits until final garden completion. A workflow can preserve its flower artifacts with `cleanupOnCompletion: false`, and the active workflow can keep completion in the current session with `clearOnCompletion: false`.

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

After registration, Workflower automatically exposes the start command:

```text
/wf:custom-demo <garden-name>
```

The Pi extension entry points at Workflower's public ESM module (`./dist/index.mjs`), and the registry is stored on `globalThis`, so command handlers and external package imports share the same in-process registry even when extension bundles load separately. Workflower registers `/wf:<workflow-id>` commands for workflows already present when the extension loads and for workflows contributed later in the same process.

Workflower does not ship workflows itself; it provides the registration and command runtime for workflow packages, published workflow collections, or local workflow extensions.

If you want Pi to create a workflow package for you, install the standalone `@supierior/workflower-authoring` skill package. That authoring package does not load the Workflower runtime; generated workflow packages depend on Workflower internally.

## State and artifacts

- Active flower workdir: `.pi/workflows/<garden-name>/<sequence>-<workflow-id>/`
- Flower index: `.pi/workflows/<garden-name>/<sequence>-<workflow-id>/index.json`
- Active state: `.pi/tmp/workflows/active/<session-id>.json`

The flower index stores `status`, `workflowId`, `flowerPath`, `pollen`, and `pollenPinned`. Active state stores `sessionId`, optional `sessionFile`, `id`, `name`, `gardenName`, `gardenPath`, `activeFlowerName`, `activeFlowerPath`, `workdir`, `currentStepIndex`, optional `contextBoundaryEntryId`, optional captured `runtimeDefaults`, `startedAt`, and `updatedAt`.

Workflow artifacts are not deleted by `/wf stop`. Handoffs preserve earlier flowers in the garden. At final `/next` completion, Workflower evaluates each flower's `workflowId`, looks up that workflow definition, deletes flower artifacts by default, preserves flowers whose producing workflow sets `cleanupOnCompletion: false`, and removes the garden directory only when it becomes empty.

## Development and validation

From this package:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
