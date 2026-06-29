---
name: wp-migration-story-implement
description: Implement the current XTIVIA migration story using behavioral-red TDD and focused validation.
allowed-tools: read bash edit write workflower_state_get
---

# WP Migration Story Implement

## Shared Context

Before acting, read and apply:

```text
../../story-implementation-contract.md
../../garden-state-contract.md
../../migration-methodology.md
../../playwright-artifact-contract.md
```

## Goal

Implement the single migration story identified by `wpMigrationCurrentStory` in Workflower garden state.

## Instructions

1. Use the workflow kickoff prompt for workflow id, workdir, pollen, declared outputs, and current step context. This loop is driven by garden state, not by the conversation.
2. Call `workflower_state_get` for `wpMigrationCurrentStory`. Validate that it has a `path`.
3. Read the story file at `wpMigrationCurrentStory.path`.
4. Call `workflower_state_get` for `wpMigrationStoryReview`. If it exists with `score < 4`, treat this as an improvement pass for the same story and address all `requiredImprovements`.
5. Check the working tree before editing with `git status --short`. Avoid unrelated human changes.
6. Read injected `.pi/rules` and local target-project guidance before broad source searches. Inspect only the target project files needed for the current story.
7. Follow strict behavioral-red TDD:
   - write or update the focused behavioral test/check first;
   - run it and confirm it fails for the intended missing behavior when feasible;
   - implement the smallest green change;
   - refactor only after focused validation passes.
8. Use Playwright checks, screenshots, or scripts where practical to validate desktop/mobile visual and behavioral parity for the current story.
9. Implement only `wpMigrationCurrentStory`; do not start later stories or broaden the migration scope.
10. Run the focused validation commands from the story file when feasible.

## Completion

Do not report completion until implementation and focused validation are complete, or until a true blocker is reached. In the final response, include files changed, commands run, result, and whether the story is ready for review.
