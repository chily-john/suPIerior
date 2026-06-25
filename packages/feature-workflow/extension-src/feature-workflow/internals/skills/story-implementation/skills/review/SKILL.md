---
name: story-implementation-review
description: AI-reviews the current story implementation and saves a structured 1-5 rating in garden state.
allowed-tools: read bash workflower_state_get workflower_state_set
---

# Story Implementation Review

## Shared Context

Before acting, read and apply:

```text
../../story-implementation-contract.md
../../../feature-methodology.md
../../../garden-state-contract.md
```

## Goal

Review the current working tree against the current story and save a structured review result in garden state.

## Instructions

1. Use the workflow kickoff prompt for workflow id and workdir.
2. Call `workflower_state_get` for `currentStory`. Validate that it has a `path`.
3. Read the story file.
4. Inspect implementation evidence with read-only commands only, such as `git status --short`, `git diff --stat`, and `git diff`. Do not run tests; this is an AI-only review and the implementer is responsible for passing focused validation.
5. Review for:
   - story acceptance criteria;
   - TDD evidence and test quality;
   - vertical slice completeness;
   - tracer-bullet alignment where applicable;
   - minimal scope and no gold-plating;
   - integration with existing architecture and project rules;
   - maintainability and good coding standards.
6. Assign integer methodology ratings from 1-5 and an overall `score` from 1-5. Passing is `score >= 4`.
7. Call `workflower_state_set` with key `storyReview` and the review object shape from `../../../garden-state-contract.md`. Set `reviewedPath` to the story path. Save the whole object under `storyReview`; do not save separate flat keys such as `storyReview.score`.
8. Confirm the tool result is successful before saying the review was saved. If the tool fails, report the failure instead of claiming state was saved.
9. Do not edit code and do not write a review file.
10. Respond with the score, pass/fail, and the main reason. This step is configured to advance automatically.
