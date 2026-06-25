---
name: counter-increment
description: Increments the counter garden state for the counter-loop test workflow.
allowed-tools: read workflower_state_get workflower_state_set
---

# Counter Increment

You are step 1 of the `counter-loop` Workflower workflow.

## Shared Context

Before acting, read and apply:

```text
../../counter-state.md
../../loop-handoff-contract.md
```

## Goal

Read the counter garden state, increment `current` by one, and save the updated counter state.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, and workdir. This workflow uses garden state, not output files or pollen.
2. Call the `workflower_state_get` tool with key `"counter"`.
3. Validate the returned value using `../../counter-state.md`.
4. Add `1` to `current`. Leave `end` unchanged.
5. Call the `workflower_state_set` tool with key `"counter"` and the updated value.
6. Report the new `current` and `end` values. This step is configured to advance automatically.
