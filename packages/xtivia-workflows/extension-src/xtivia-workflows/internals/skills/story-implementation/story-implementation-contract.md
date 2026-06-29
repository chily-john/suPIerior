# XTIVIA Migration Story Implementation Contract

The migration story implementation loop works one story file at a time from `wpMigrationCurrentStory`.

## Implementer responsibilities

- Read `wpMigrationCurrentStory` from Workflower garden state and read the story file at its `path`.
- If `wpMigrationStoryReview` exists with `score < 4`, treat the run as an improvement pass for the same story and address every `requiredImprovements` item.
- Implement only the current story and dependency-compatible adjustments required for it to pass.
- Use strict behavioral-red TDD: write or update a focused failing behavioral test first, make it pass minimally, then refactor.
- Use Playwright captures/checks/scripts where practical for visual and behavioral parity evidence.
- Run focused validation before reporting completion.

## Reviewer responsibilities

- Read `wpMigrationCurrentStory` and the story file.
- Review the working tree against the story, migration methodology, visual parity bar, component reuse decisions, and local target-project architecture.
- Save one structured `wpMigrationStoryReview` object in garden state.
- Include specific `requiredImprovements` when `score < 4`.
- Do not write large review reports unless explicitly asked.

## Completion

A migration story is complete when code changed as needed, behavioral tests/checks exist, focused validation passed according to the implementer, and the result remains aligned with target-project architecture and XTIVIA migration methodology.
