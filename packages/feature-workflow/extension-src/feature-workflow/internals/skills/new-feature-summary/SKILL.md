---
name: new-feature-summary
description: Summarizes the clarified new feature conversation into feature-summary.md.
allowed-tools: write
---

# New Feature Summary

You are step 2 of the `new-feature` Workflower workflow.

## Goal

Turn the retained grill conversation into a detailed, implementation-ready feature summary.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and expected output paths.
2. Summarize from the previous conversation context. Do not ask new questions unless the feature is impossible to summarize without fabricating critical requirements.
3. Create the declared output file: `feature-summary.md`.
4. Write `feature-summary.md` at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it relative to the current working directory.
5. Use this structure:

   ```markdown
   # Feature Summary: <feature name>

   ## Problem

   ## Users and goals

   ## Current behavior / context

   ## Desired behavior

   ## Non-goals

   ## Scope

   ## Affected packages, files, commands, or integrations

   ## User stories

   ## Acceptance criteria

   ## Edge cases and failure modes

   ## Testing expectations

   ## Documentation expectations

   ## Dependencies and sequencing notes

   ## Open questions or assumptions
   ```

6. Be detailed and explicit. Preserve uncertainty as assumptions/open questions instead of inventing requirements.
7. Tell the user the file was written. This step is configured to advance automatically.
