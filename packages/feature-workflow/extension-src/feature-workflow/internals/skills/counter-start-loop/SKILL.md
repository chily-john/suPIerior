---
name: counter-start-loop
description: Hands the counter workflow off to the counter-loop workflow.
allowed-tools: workflower_state_get workflower_handoff
---

# Counter Start Loop

You are step 2 of the `counter` Workflower workflow.

## Goal

Start the `counter-loop` workflow so it can increment the initialized counter garden state.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, and workdir. This workflow uses garden state, not output files or pollen.
2. Call the `workflower_state_get` tool with key `"counter"`.
3. Fail with a clear error if the key is missing or if its value is not an object with finite integer `current` and `end` values.
4. Call the `workflower_handoff` tool with workflowId `"counter-loop"`. Do not print or send `/wf:counter-loop` as text.
5. Do not pass a garden name. Workflower is already active and will hand off inside the current garden.
