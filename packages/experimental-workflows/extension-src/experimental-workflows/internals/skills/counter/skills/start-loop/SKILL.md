---
name: counter-start-loop
description: Hands the counter workflow off to the counter-loop workflow.
allowed-tools: read workflower_state_get workflower_handoff
---

# Counter Start Loop

You are step 2 of the `counter` Workflower workflow.

## Shared Context

Before acting, read and apply:

```text
../../counter-state.md
../../loop-handoff-contract.md
```

## Goal

Start the `counter-loop` workflow so it can increment the initialized counter garden state.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, and workdir. This workflow uses garden state, not output files or pollen.
2. Call the `workflower_state_get` tool with key `"counter"`.
3. Validate the returned value using `../../counter-state.md`.
4. Call the `workflower_handoff` tool with workflowId `"counter-loop"`. Do not print or send `/wf:counter-loop` as text.
5. Do not pass a garden name. Workflower is already active and will hand off inside the current garden.
