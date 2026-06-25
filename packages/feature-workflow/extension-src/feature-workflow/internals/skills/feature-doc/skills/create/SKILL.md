---
name: feature-doc-create
description: Turns a grilled or organic feature conversation into feature-doc.md and saves its path in garden state.
allowed-tools: read write workflower_state_set
---

# Feature Doc Create

## Shared Context

Before acting, read and apply:

```text
../../feature-doc-format.md
../../../feature-methodology.md
../../../garden-state-contract.md
```

## Goal

Create `feature-doc.md` from the retained conversation context or current workflow prompt, then save its absolute path in Workflower garden state.

## Instructions

1. Use the workflow kickoff prompt for workflow id, workdir, incoming pollen, and expected output paths.
2. Write the declared output file `feature-doc.md` at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it in the current working directory.
3. Follow `../../feature-doc-format.md`.
4. Make the document detailed enough for implementation planning without the original conversation.
5. Preserve uncertainty explicitly in `Open Questions and Assumptions`; do not invent product decisions.
6. Call `workflower_state_set` with key `featureDocPath` and the absolute path to `feature-doc.md`.
7. Tell the user the feature doc was written and that its path was saved. If this step auto-advances, keep the response concise.
