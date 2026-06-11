# Workflower Garden/Flower Workflow Management

## Goal

Rework Workflower artifact and lifecycle management around temporary **gardens** and chained workflow execution **flowers**.

- A **garden** is a temporary wrapper for a named workflow run.
- A **flower** is one workflow execution inside that garden.
- All step outputs for one workflow execution go into that workflow's flower folder.
- Workflows can hand off pollen to the next workflow when chained in the same garden.

## Folder model

Gardens live under `.pi/workflows/` and are named by the initial workflow start argument.

```text
.pi/workflows/
  run-one/
    0001-some_workflow/
      index.json
      output-a.md
      output-b.md

    0002-some_other_workflow/
      index.json
      output-c.md
```

There is no garden-level index. The garden exists only as a temporary chaining wrapper.

## Workflow ids

Workflow ids should become folder-safe and no longer support colon-separated names.

Recommended validation:

```text
^[a-z0-9_-]+$
```

Examples:

- `feature`
- `github_issue`
- `review-pr`

Disallowed:

- `github:issue`
- `Feature`
- `has space`
- `../bad`

## WorkflowDefinition additions

```ts
type WorkflowDefinition = {
  id: string;
  pollen?: string | string[];
  acceptPollen?: boolean; // default true
  cleanupOnCompletion?: boolean;
  clearOnStart?: boolean;
  clearOnCompletion?: boolean;
  steps: WorkflowStep[];
};
```

`pollen` identifies the workflow output path or paths intended to be passed to the next workflow. It is workflow-level, not step-level.

`acceptPollen` controls whether a workflow receives previous flower pollen in its kickoff prompt when started inside an existing garden. It defaults to `true`.

## Command behavior

### No active workflow

```text
/wf:some_workflow run-one
```

Creates:

```text
.pi/workflows/run-one/
  0001-some_workflow/
```

Then starts step 0 of `some_workflow`.

If no garden name is provided:

```text
/wf:some_workflow
```

Workflower should report an error because a garden name is required when no workflow is active.

### Active workflow exists

```text
/wf:some_other_workflow
```

This performs a handoff:

1. The current flower status becomes `"handedOff"`.
2. The current flower index is finalized as-is.
3. A new flower folder is created in the same garden:

   ```text
   .pi/workflows/run-one/0002-some_other_workflow/
   ```

4. Previous flower pollen paths are referenced in the new kickoff prompt unless the new workflow has `acceptPollen: false`.
5. The new workflow's `clearOnStart` behavior still applies.

If a garden name is supplied while active:

```text
/wf:some_other_workflow run-two
```

Workflower should report an error because the current garden is already established.

## Flower index

Each flower has an `index.json`.

Status values:

```ts
"active" | "handedOff" | "completed"
```

Example:

```json
{
  "status": "active",
  "workflowId": "some_workflow",
  "flowerPath": "C:/repo/.pi/workflows/run-one/0001-some_workflow",
  "pollen": [
    "C:/repo/.pi/workflows/run-one/0001-some_workflow/draft.md"
  ],
  "pollenPinned": false
}
```

Pollen paths should be absolute paths.

## Pollen update behavior

The flower index updates as `/next` advances through steps.

Rules:

1. If the completed step has outputs, those outputs become the current pollen.
2. If `workflow.pollen` is configured and the completed step declares that pollen output, pollen becomes pinned.
3. Once pinned, later step outputs do not replace it.
4. Workflower should not guess or recover from incorrect declarations. If a workflow author declares outputs or pollen incorrectly, the resulting pollen will be wrong and the author must debug the workflow definition.

Confirmed example:

```ts
{
  id: "demo",
  pollen: "final.md",
  steps: [
    { id: "draft", outputs: ["draft.md"] },
    { id: "final", outputs: ["final.md"] },
    { id: "extra", outputs: ["extra.md"] }
  ]
}
```

After `draft`:

```json
{
  "pollen": ["<abs>/draft.md"],
  "pollenPinned": false
}
```

After `final`:

```json
{
  "pollen": ["<abs>/final.md"],
  "pollenPinned": true
}
```

After `extra`:

```json
{
  "pollen": ["<abs>/final.md"],
  "pollenPinned": true
}
```

For `pollen: string[]`, the configured pollen paths should be used together when the configured pollen is pinned.

## Incoming pollen behavior

When a workflow is started inside an existing active garden, the previous flower's indexed pollen paths are referenced in the new workflow kickoff prompt if the new workflow accepts pollen.

- Pollen is not copied into the new flower.
- Pollen content is not injected into the prompt.
- The prompt references paths only.
- If `acceptPollen: false`, the kickoff prompt should omit previous pollen entirely.
- If there is no previous pollen, the kickoff prompt should omit previous pollen entirely.

## Completion behavior

When `/next` is called at the end of the active workflow:

1. The current flower status becomes `"completed"`.
2. The entire garden completes.
3. Workflower cleans up each flower according to that flower's workflow definition.
4. If the garden directory becomes empty after cleanup, Workflower removes the garden directory.
5. Active state is cleared.

Gardens cannot be idle. If no workflow is active, the garden is done.

## Cleanup behavior

Cleanup does not happen during handoff. During handoff, previous flowers remain available so their pollen can be passed to later workflows.

Cleanup happens only when the whole garden completes. At that point, each flower is cleaned up according to the `cleanupOnCompletion` value of the workflow definition that produced that flower.

This likely requires storing enough metadata in active garden state or flower indexes to know which workflow definition belongs to each flower at garden completion.
