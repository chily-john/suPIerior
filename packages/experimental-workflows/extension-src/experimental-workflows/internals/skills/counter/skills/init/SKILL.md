---
name: counter-init
description: Initializes the counter garden state for the counter test workflow.
allowed-tools: read workflower_state_set
---

# Counter Init

You are step 1 of the `counter` Workflower workflow.

## Shared Context

Before acting, read and apply:

```text
../../counter-state.md
../../loop-handoff-contract.md
```

## Goal

Ask for a starting number and an end number, then save the initial counter state in Workflower garden state.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, and workdir. This workflow uses garden state, not output files.
2. If the user has not already provided both values, then first ask for `current`, the starting integer value; and once the user has replied, then ask for `end`, the ending integer value.
3. Validate that both values are finite integers. If either value is missing or invalid, ask again and do not save state yet.
4. Call the `workflower_state_set` tool with key `"counter"` and a value matching `../../counter-state.md`.
5. Do not increment the starting value in this step.
6. Tell the user the counter garden state was saved and ask them to type `/next` to start the loop handoff step.
