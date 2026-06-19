---
name: counter-increment
description: Increments counter-state.json for the counter-loop test workflow.
allowed-tools: read write
---

# Counter Increment

You are step 1 of the `counter-loop` Workflower workflow.

## Goal

Read the incoming counter state, increment `current` by one, and write the new counter state as this flower's output/pollen.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, incoming pollen paths, and expected output paths.
2. Read the incoming pollen `counter-state.json` path shown in the kickoff prompt. If multiple incoming pollen paths are shown, use the one named `counter-state.json`.
3. Fail with a clear error if the file is missing, is not valid JSON, or does not contain finite integer `current` and `end` values.
4. Add `1` to `current`. Leave `end` unchanged.
5. Create the declared output file: `counter-state.json`.
7. The file must contain exactly this JSON shape:

   ```json
   {
     "current": 1,
     "end": 5
   }
   ```

   Replace the example numbers with the incremented `current` and existing `end`.
8. Report the new `current` and `end` values. This step is configured to advance automatically.
