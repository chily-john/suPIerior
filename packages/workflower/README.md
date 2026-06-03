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

This initial slice only starts a registered workflow at step 0. Advancing with `/next`, status/cancel lifecycle commands, and broader command validation are planned follow-up slices.
