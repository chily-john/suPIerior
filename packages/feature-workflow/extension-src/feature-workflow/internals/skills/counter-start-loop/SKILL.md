---
name: counter-start-loop
description: Hands the counter workflow off to the counter-loop workflow.
allowed-tools: read workflower_handoff
---

# Counter Start Loop

You are step 2 of the `counter` Workflower workflow.

## Goal

Start the `counter-loop` workflow so it can increment the initialized counter state.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and incoming/expected paths.
2. Read the previous step's `counter-state.json` path shown in the kickoff prompt.
3. Fail with a clear error if the file is missing, is not valid JSON, or does not contain finite integer `current` and `end` values.
4. Call the `workflower_handoff` tool with workflowId `"counter-loop"`. Do not print or send `/wf:counter-loop` as text.
5. Do not pass a garden name. Workflower is already active and will hand off inside the current garden.
