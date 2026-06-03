# @supierior/workflower

Workflower is a Pi package for running named multi-step workflows in fresh step sessions while persisting lightweight workflow state on disk.

## Start a workflow

```text
/workflow start <workflow-id> <workflow-name>
```

The V1 smoke workflow is:

```text
/workflow start feature-to-github-issues my-feature
```

Starting a workflow:

1. looks up the registered workflow by id;
2. creates a workdir at `.pi/workflows/<workflow-type>/<workflow-name>/`;
3. writes durable active state to `.pi/tmp/workflows/active.json`;
4. opens a fresh Pi session with `ctx.newSession()`; and
5. sends the step-0 kickoff prompt inside the replacement session.

The kickoff prompt includes the workflow id, type, name, workdir, current step id and command, expected output paths resolved inside the workdir, and an instruction to use `/next` after the user verifies the step output.

## Inspect workflow status

```text
/workflow status
```

When no workflow is active, Workflower reports that there is no active workflow. When a workflow is active, status shows the workflow id, type, name, workdir, and current step id/command.

## Cancel active workflow state

```text
/workflow cancel
```

Cancelling clears `.pi/tmp/workflows/active.json` and reports which workflow was cancelled. It does not delete workflow artifacts or generated files under `.pi/workflows/<workflow-type>/<workflow-name>/`; users can inspect, reuse, or remove those files manually.

## Advance to the next step

```text
/next
```

Workflower advances by explicit user intent. After you complete and manually verify a step's declared outputs, type `/next`; no workflow id, name, or type is required. Workflower reads `.pi/tmp/workflows/active.json`, increments `currentStepIndex`, persists the new active state, opens a fresh Pi session with `ctx.newSession()`, and sends the next kickoff prompt inside the replacement session.

Next-step prompts include:

- the previous step's declared outputs, resolved relative to the workflow workdir;
- the current step's expected outputs, also resolved relative to the workflow workdir; and
- the command to run for the current step.

Workflower intentionally advances blindly by user intent. It does not check whether output files exist, validate artifacts, or parse prompt text for state. If session replacement is cancelled or fails after state is advanced, Workflower reports the failure and leaves active state at the advanced step so the user can inspect state or continue intentionally.

When `/next` advances beyond the final step, Workflower clears `.pi/tmp/workflows/active.json`, reports workflow completion, and does not create another session. If there is no active state, it reports `No active workflow.`; if the saved workflow definition is unavailable, it reports an error and does not mutate active state.

## Included workflow

`feature-to-github-issues` is a smoke-test workflow for planning GitHub issues from a feature:

1. `discover` — `/feature-discovery`, output `feature.md`
2. `plan-issues` — `/feature-plan-issues`, output `issues.md`
3. `review-issues` — `/feature-review-issues`, output `reviewed-issues.md`
4. `create-github-issues` — `/github-create-issues`

## State and artifacts

- Workdir: `.pi/workflows/<workflow-type>/<workflow-name>/`
- Active state: `.pi/tmp/workflows/active.json`

Active state stores `workflowId`, `type`, `name`, `workdir`, `currentStepIndex`, `startedAt`, and `updatedAt`.

## V1 non-goals

This initial slice starts a registered workflow at step 0 and exposes basic status/cancel lifecycle commands. Advancing with `/next` and broader command validation are planned follow-up slices.
Status/cancel lifecycle commands and broader command validation are planned follow-up slices.
