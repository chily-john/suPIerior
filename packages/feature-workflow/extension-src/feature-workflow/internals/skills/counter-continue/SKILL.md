---
name: counter-continue
description: Decides whether to hand off to another counter-loop iteration.
allowed-tools: workflower_state_get workflower_handoff
---

# Counter Continue

You are step 2 of the `counter-loop` Workflower workflow.

## Goal

Read the counter garden state. If `current` is less than `end`, start another `counter-loop` flower. If `current` is the same as or greater than `end`, do nothing so the workflow can finish.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, and workdir. This workflow uses garden state, not output files or pollen.
2. Call the `workflower_state_get` tool with key `"counter"`.
3. Fail with a clear error if the key is missing or if its value is not an object with finite integer `current` and `end` values.
4. Compare `current` and `end`.
5. If `current < end`, call the `workflower_handoff` tool with workflowId `"counter-loop"`. Do not print or send `/wf:counter-loop` as text.
6. If `current >= end`, do not call the tool. Report that the counter loop is complete and include the final `current` and `end` values.
7. This step is configured to advance automatically after the agent run completes. When no new loop is started, auto-next completes the workflow garden.
