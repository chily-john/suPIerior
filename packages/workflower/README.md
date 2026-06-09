# @supierior/workflower

Workflower is a Pi package for running named, multi-step workflows with configurable context boundaries while persisting lightweight session-scoped workflow state on disk.

## Command surface

Workflower registers:

- `/wf:<workflow-id>` commands for every registered workflow.
- `/wf` for active workflow lifecycle helpers.
- `/next` to advance the active workflow to the next step.

Workflow command names are created automatically from registered workflow ids. For example, a workflow with id `feature` is started with:

```text
/wf:feature <workflow-name>
```

Namespaced workflow ids use additional colons:

```text
/wf:github:issue <workflow-name>
```

Workflow ids must be command-safe: non-empty, contain no whitespace or control characters, not start with `/`, not start with `wf:`, and not contain shell/confusing characters such as quotes, backticks, backslashes, pipes, angle brackets, braces, or square brackets. Exact duplicate workflow ids are rejected during registration because they would create the same `/wf:<id>` command.

## Start a workflow

```text
/wf:<workflow-id> <workflow-name>
```

For example:

```text
/wf:custom:demo my-workflow
```

Starting a workflow:

1. looks up the registered workflow by id;
2. creates a workdir at `.pi/workflows/<workflow-id>/<workflow-name>/`;
3. opens a fresh Pi session with `ctx.newSession()` unless the workflow sets `clearOnStart: false`;
4. writes durable active state for the selected Pi session to `.pi/tmp/workflows/active/<session-id>.json`; and
5. sends the step-0 kickoff prompt inside the selected session.

`<workflow-name>` must be a safe path segment because it becomes part of the workflow artifact path. Workflow names must be unique within a workflow id because artifacts are stored at `.pi/workflows/<workflow-id>/<workflow-name>/`. Missing arguments, extra arguments, unknown workflow ids, unsafe names, duplicate names for the same workflow id, and an already-active workflow in the current Pi session are reported with friendly error messages.

## Inspect or stop active workflow state

```text
/wf status
/wf stop
/wf list
```

When no workflow is active in the current Pi session, `/wf status` reports that there is no active workflow. When a workflow is active, status shows the workflow id, name, workdir, and current step id/command. If the saved active state references a workflow id that is no longer registered, status reports that mismatch as a warning.

`/wf stop` clears the current session's `.pi/tmp/workflows/active/<session-id>.json` state and reports which workflow was stopped. It does not delete workflow artifacts or generated files under `.pi/workflows/<workflow-id>/<workflow-name>/`; users can inspect, reuse, or remove those files manually.

`/wf list` shows all session-scoped active workflow states in the repo and marks entries outside the current Pi session as `stale/other session` so abandoned sessions are visible without automatically adopting them.

## Advance to the next step

```text
/next
```

Workflower advances by explicit user intent in the current Pi session. After you complete and manually verify a step's declared outputs, type `/next`; no workflow id or name is required. If `/next` receives any arguments, Workflower reports `Usage: /next` and does not advance state.

A step can set `autoNext: true` to advance directly after an agent run completes while that step is active. Auto-next uses the same internal advancement behavior as manual `/next`, including `clearOnNext`, final-step completion, completion cleanup, and chained auto-next steps. It does not queue a literal `/next` message.

Workflower intentionally advances blindly by user intent. It does not check whether output files exist, validate artifacts, or parse prompt text for state. Non-final advancement keeps the visible session and clears model context through `contextBoundaryEntryId` unless `clearOnNext: false`.

When `/next` advances beyond the final step, Workflower clears the current session's active state, deletes the completed workdir by default, and reports workflow completion. A workflow can preserve artifacts with `cleanupOnCompletion: false` and keep completion in the current session with `clearOnCompletion: false`.

## Register workflows from another package

Workflower exposes a small workflow-authoring API from the package root. A separate package can contribute a workflow by importing `registerWorkflow` from `@supierior/workflower` during extension startup:

```ts
import { registerWorkflow } from "@supierior/workflower";
import type { WorkflowDefinition } from "@supierior/workflower";

const myWorkflow: WorkflowDefinition = {
  id: "custom:demo",
  clearOnStart: false,
  clearOnCompletion: false,
  cleanupOnCompletion: false,
  steps: [
    {
      id: "first",
      command: "/my-first-step",
      outputs: ["first.md"],
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
/wf:custom:demo <workflow-name>
```

The Pi extension entry points at Workflower's public ESM module (`./dist/index.mjs`), and the registry is stored on `globalThis`, so command handlers and external package imports share the same in-process registry even when extension bundles load separately. Workflower registers `/wf:<workflow-id>` commands for workflows already present when the extension loads and for workflows contributed later in the same process.

Workflower does not ship workflows itself; it provides the registration and command runtime for workflow packages, published workflow collections, or local workflow extensions.

If you want Pi to create a workflow package for you, install the standalone `@supierior/workflower-authoring` skill package. That authoring package does not load the Workflower runtime; generated workflow packages depend on Workflower internally.

## State and artifacts

- Workdir: `.pi/workflows/<workflow-id>/<workflow-name>/`
- Active state: `.pi/tmp/workflows/active/<session-id>.json`

Active state stores `sessionId`, optional `sessionFile`, `id`, `name`, `workdir`, `currentStepIndex`, optional `contextBoundaryEntryId`, `startedAt`, and `updatedAt`.

Workflow artifacts are not deleted by `/wf stop`. By default, `/next` completion deletes the completed workflow workdir; set `cleanupOnCompletion: false` on a workflow definition to preserve those artifacts.

## Development and validation

From this package:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
