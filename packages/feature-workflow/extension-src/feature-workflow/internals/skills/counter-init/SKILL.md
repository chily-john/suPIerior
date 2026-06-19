---
name: counter-init
description: Initializes counter-state.json for the counter test workflow.
allowed-tools: write
---

# Counter Init

You are step 1 of the `counter` Workflower workflow.

## Goal

Ask for a starting number and an end number, then write the initial counter state.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, and expected output paths.
2. If the user has not already provided both values, ask for:
   - `current`: the starting integer value;
   - `end`: the ending integer value.
3. Validate that both values are finite integers. If either value is missing or invalid, ask again and do not write the output yet.
4. Create the declared output file: `counter-state.json`.
5. Write `counter-state.json` at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it relative to the current working directory.
6. The file must contain exactly this JSON shape:

   ```json
   {
     "current": 0,
     "end": 5
   }
   ```

   Replace the example numbers with the user's values.
7. Do not increment the starting value in this step.
8. Tell the user the file was written and ask them to type `/next` to start the loop handoff step.
