---
name: story-implement
description: Implements the current story from garden state using strict behavioral-red TDD and focused validation.
allowed-tools: read bash edit write workflower_state_get
---

# Story Implement

## Shared Context

Before acting, read and apply:

```text
../../story-implementation-contract.md
../../../feature-methodology.md
../../../garden-state-contract.md
```

## Goal

Implement the single story identified by `currentStory` in Workflower garden state.

## Instructions

1. Use the workflow kickoff prompt for workflow id and workdir. This workflow is driven by garden state, not incoming conversation.
2. Call `workflower_state_get` for `currentStory`. Validate that it has a `path`.
3. Read the story file at `currentStory.path`.
4. Call `workflower_state_get` for `storyReview`. If it exists with `score < 4`, treat this as an improvement pass for the same story and address `requiredImprovements`.
5. Check the working tree before editing with `git status --short`. Avoid unrelated human changes.
6. Follow strict behavioral-red TDD:
   - write or update the focused behavioral test first;
   - run it and confirm it fails for the intended missing behavior when feasible;
   - implement the smallest green change;
   - refactor only after focused tests pass.
7. Implement only the current story. Do not start later stories.
8. Run focused validation from the story file when feasible. Broader validation is optional unless the story requires it.
9. Do not send a final response until implementation and focused validation are complete, or until you are genuinely blocked.
10. In the final response, include files changed, tests/commands run, result, and whether the story is ready for review. This step is configured to advance automatically after the agent run ends.
