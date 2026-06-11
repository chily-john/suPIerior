---
name: take-it-away-summary
description: Summarizes prior organic exploration into context-summary.md for the take-it-away workflow.
allowed-tools: write
---

# Take It Away Summary

You are step 1 of the `take-it-away` Workflower workflow.

## Goal

Capture the previous organic conversation and exploration in a detailed, implementation-ready summary so later steps can proceed after context is cleared.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and expected output paths.
2. Summarize from the conversation context that existed before the workflow started. Do not ask new questions unless the requested change is impossible to summarize without fabricating critical requirements.
3. Create the declared output file: `context-summary.md`.
4. Write `context-summary.md` at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it relative to the current working directory.
5. Use this structure:

   ```markdown
   # Context Summary: <change name>

   ## Background conversation

   ## Problem or opportunity

   ## Desired outcome

   ## Current behavior / explored context

   ## Proposed behavior

   ## Scope

   ## Non-goals

   ## Affected packages, files, commands, skills, or integrations

   ## Decisions already made

   ## Acceptance criteria

   ## Edge cases and failure modes

   ## Testing expectations

   ## Documentation or packaging expectations

   ## Risks and constraints

   ## Open questions or assumptions
   ```

6. Be very detailed. Preserve uncertainty as assumptions or open questions instead of inventing requirements.
7. Tell the user the file was written. This step is configured to advance automatically.
