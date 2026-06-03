# @supierior/workflower

Workflower is a Pi package for running named, multi-step workflows in fresh step sessions while persisting lightweight workflow state on disk.

## V1 command surface

Workflower registers two Pi commands when the extension loads:

- `/workflow` — start and manage active workflow state.
- `/next` — advance the active workflow to the next step.

### Start a workflow

```text
/workflow start <workflow-id> <workflow-name>
```

The included V1 sample workflow is:

```text
/workflow start feature-to-github-issues my-feature
```

Starting a workflow:

1. looks up the registered workflow by id;
2. creates a workdir at `.pi/workflows/<workflow-type>/<workflow-name>/`;
3. writes durable active state to `.pi/tmp/workflows/active.json`;
4. opens a fresh Pi session with `ctx.newSession()`; and
5. sends the step-0 kickoff prompt inside the replacement session.

`<workflow-name>` must be a safe path segment because it becomes part of the workflow artifact path. Missing arguments, extra arguments, unknown workflow ids, unsafe names, and an already-active workflow are reported with friendly error messages.

### Inspect workflow status

```text
/workflow status
```

When no workflow is active, Workflower reports that there is no active workflow. When a workflow is active, status shows the workflow id, type, name, workdir, and current step id/command. If the saved active state references a workflow id that is no longer registered, status reports that mismatch as a warning.

### Cancel active workflow state

```text
/workflow cancel
```

Cancelling clears `.pi/tmp/workflows/active.json` and reports which workflow was cancelled. It does not delete workflow artifacts or generated files under `.pi/workflows/<workflow-type>/<workflow-name>/`; users can inspect, reuse, or remove those files manually.

### Advance to the next step

```text
/next
```

Workflower advances by explicit user intent. After you complete and manually verify a step's declared outputs, type `/next`; no workflow id, name, or type is required. If `/next` receives any arguments, Workflower reports `Usage: /next` and does not advance state.

When `/next` runs with no arguments, Workflower reads `.pi/tmp/workflows/active.json`, increments `currentStepIndex`, persists the new active state, opens a fresh Pi session with `ctx.newSession()`, and sends the next kickoff prompt inside the replacement session.

Next-step prompts include:

- the previous step's declared outputs, resolved relative to the workflow workdir;
- the current step's expected outputs, also resolved relative to the workflow workdir; and
- the command to run for the current step.

Workflower intentionally advances blindly by user intent. It does not check whether output files exist, validate artifacts, or parse prompt text for state. If session replacement is cancelled or fails after state is advanced, Workflower reports the failure and leaves active state at the advanced step so the user can inspect state or continue intentionally.

When `/next` advances beyond the final step, Workflower clears `.pi/tmp/workflows/active.json`, reports workflow completion, and does not create another session. If there is no active state, it reports `No active workflow.`; if the saved workflow definition is unavailable, it reports an error and does not mutate active state.

Unknown `/workflow` subcommands report the supported subcommands: `start`, `status`, and `cancel`.

## Included workflow

`feature-to-github-issues` is a sample workflow for planning GitHub issues from a feature:

1. `discover` — `/feature-discovery`, output `feature.md`
2. `plan-issues` — `/feature-plan-issues`, output `issues.md`
3. `review-issues` — `/feature-review-issues`, output `reviewed-issues.md`
4. `create-github-issues` — `/github-create-issues`

## State and artifacts

- Workdir: `.pi/workflows/<workflow-type>/<workflow-name>/`
- Active state: `.pi/tmp/workflows/active.json`

Active state stores `workflowId`, `type`, `name`, `workdir`, `currentStepIndex`, `startedAt`, and `updatedAt`.

Workflow artifacts are not deleted by `/workflow cancel` or `/next` completion. Active state is the only file Workflower mutates after the initial workdir setup.

## V1 non-goals

Workflower V1 deliberately does not:

- validate whether declared output files exist before advancing;
- inspect or grade workflow artifacts;
- discover workflows from arbitrary user directories;
- manage multiple concurrent active workflows;
- delete generated workflow artifacts; or
- unregister `/next` when no workflow is active.

## Development and validation

From this package:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

From the repository root, use the standard workspace checks when validating cross-package impact:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
```
