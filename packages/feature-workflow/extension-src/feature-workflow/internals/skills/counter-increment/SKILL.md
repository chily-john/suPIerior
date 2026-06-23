---
name: counter-increment
description: Increments the counter garden state for the counter-loop test workflow.
allowed-tools: workflower_state_get workflower_state_set
---

# Counter Increment

You are step 1 of the `counter-loop` Workflower workflow.

## Goal

Read the counter garden state, increment `current` by one, and save the updated counter state.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, and workdir. This workflow uses garden state, not output files or pollen.
2. Call the `workflower_state_get` tool with key `"counter"`.
3. Fail with a clear error if the key is missing or if its value is not an object with finite integer `current` and `end` values.
4. Add `1` to `current`. Leave `end` unchanged.
5. Call the `workflower_state_set` tool with key `"counter"` and this JSON-compatible value:

   ```json
   {
     "current": 1,
     "end": 5
   }
   ```

   Replace the example numbers with the incremented `current` and existing `end`.

6. Report the new `current` and `end` values. This step is configured to advance automatically.
