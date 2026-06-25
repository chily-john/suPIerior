# Implementation Doc Format

`implementation-doc.md` converts `feature-doc.md` into implementation-ready stories.

Use this structure:

```markdown
# Implementation Plan: <Feature Name>

## Feature Source

- Feature doc: <path>

## Outcome and Constraints

## Architecture / Integration Notes

## Tracer Bullet Strategy

Describe the thinnest end-to-end behavior that should be built first to prove the risky seams.

## Story Dependency Graph

List each story and its hard dependencies. Dependencies are hard only when a story cannot pass its own tests until another story is finished.

## Stories

### Story 001: <title>

Dependencies: none

#### Goal

#### User-Visible / Integration-Visible Slice

#### Acceptance Criteria

#### Red Phase

- Test file:
- Test case:
- Expected failing assertion:

#### Green Phase

#### Refactor Phase

#### Validation Commands

#### Notes for Junior Developer

### Story 002: <title>

Dependencies: Story 001
...

## Whole-Feature Validation

## Risks and Blocked States
```

Rules:

- Stories must be topologically ordered.
- Every story must be implementation-ready and written as instructions to a junior developer.
- Avoid horizontal stories unless they are embedded in an observable vertical slice.
- Name concrete files/tests/commands when they can be inferred from the repository.
- Preserve uncertainty as assumptions or blocked states instead of guessing.
