---
name: wp-migration-story-review
description: Review the current XTIVIA migration story implementation and save a structured garden-state result.
allowed-tools: read bash workflower_state_get workflower_state_set
---

# WP Migration Story Review

## Shared Context

Before acting, read and apply:

```text
../../story-implementation-contract.md
../../garden-state-contract.md
../../migration-methodology.md
../../playwright-artifact-contract.md
```

## Goal

Review the current migration story implementation and save a concise structured `wpMigrationStoryReview` object in Workflower garden state.

## Instructions

1. Use the workflow kickoff prompt for workflow id, workdir, current step context, and artifacts.
2. Call `workflower_state_get` for `wpMigrationCurrentStory`. Validate that it has a `path`.
3. Read the story file.
4. Inspect implementation evidence with read-only commands such as `git status --short`, `git diff --stat`, and `git diff`. Do not edit files.
5. Review against:
   - the story acceptance criteria;
   - behavioral-red TDD evidence and focused test/check quality;
   - desktop/mobile visual parity expectations and Playwright evidence where practical;
   - target-project architecture and `.pi/rules` alignment;
   - component reuse/build decisions from the migration methodology;
   - minimal POC scope with no CMS/platform overbuild.
6. Assign an integer `score` from 1 to 5. Scores `>= 4` pass. When `score < 4`, include specific actionable `requiredImprovements` for the next implementation pass.
7. Call `workflower_state_set` with key `wpMigrationStoryReview` and this concise object shape:

```json
{
  "score": 4,
  "passes": true,
  "summary": "Short reason for the score.",
  "methodologyRatings": {
    "capture": 4,
    "visualParity": 4,
    "architecture": 4,
    "componentReuse": 4,
    "pocScope": 4
  },
  "requiredImprovements": [],
  "reviewedPath": "/absolute/path/to/story.md"
}
```

8. Confirm the tool result is successful before saying the review was saved.
9. Keep the garden-state summary short. Do not write a large review report unless explicitly requested.

## Completion

Respond with the score, pass/fail, and main reason after `wpMigrationStoryReview` is saved.
