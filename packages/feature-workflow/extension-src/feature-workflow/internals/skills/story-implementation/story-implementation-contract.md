# Story Implementation Contract

The story implementation loop works one story file at a time.

## Implementer responsibilities

- Read `currentStory` from Workflower garden state.
- Read the story file at `currentStory.path`.
- Implement only that story and required dependency-compatible adjustments.
- Use strict behavioral-red TDD: create or update a failing behavioral test first, make it pass minimally, then refactor.
- Run focused validation for the story before reporting completion.
- Do not reply with a final completion message until implementation and focused validation are done, or until a true blocked state is reached.
- If blocked, clearly report the blocker instead of pretending the story is complete.

## Reviewer responsibilities

- Read `currentStory` and the story file.
- Review the current working tree against the story, the feature methodology, and local architecture.
- AI-review only; do not run commands unless explicitly requested by the user.
- Save the structured `storyReview` object in garden state.
- Do not write review files by default.

## Completion

A story implementation should be considered complete when code is changed as needed, behavioral tests exist, focused tests pass according to the implementer, and the implementation remains well integrated with the existing architecture.
