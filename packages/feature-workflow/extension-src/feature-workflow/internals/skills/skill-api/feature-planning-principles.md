# Feature Planning Principles

Shared guidance for feature-workflow skills that turn discovery context into implementation-ready plans.

## TDD-first planning

- Every implementation slice should start with a meaningful behavioral red test.
- A valid red test must run and fail because requested behavior is absent or incorrect, not because of syntax errors, missing imports, type errors, or incomplete test setup.
- Name the specific test files, test cases, fixtures, and expected failing assertions when they can be inferred.
- Keep the green phase minimal: implement only what is needed to pass the red test for that slice.
- Reserve refactoring for after focused tests pass, and keep refactors scoped to the requested change.
- Include focused validation commands for each slice and broader validation commands for completion.

## Vertical slicing

- Prefer the smallest practical functional slice that delivers a user-visible, API-visible, command-visible, workflow-visible, or integration-visible outcome.
- Avoid horizontal layers such as "add types", "create utilities", or "wire plumbing" unless they are embedded in a functional slice.
- Each slice should be independently reviewable and testable.
- Split broad work when a slice contains multiple behaviors, unrelated integrations, or separate risk profiles.
- Make dependencies explicit only when one slice truly cannot start until another is complete.
- Preserve maximum safe concurrency by avoiding unnecessary sequencing.

## Implementation-plan quality bar

A strong implementation plan includes:

- a concise outcome statement;
- assumptions and open questions that must not be silently invented;
- affected packages, files, commands, skills, docs, tests, and integration points;
- ordered vertical slices with concrete TDD red/green/refactor steps;
- acceptance criteria that can be observed or validated;
- documentation and packaging updates when user-facing behavior changes;
- validation commands and expected evidence;
- risks, rollback notes, and blocked states.

## Review quality bar

When reviewing a plan, correct it until:

- all work is traceable to the summarized context;
- every slice has a behavioral red test before production edits;
- no slice is a vague task or pure horizontal layer;
- dependencies and ordering are necessary and explicit;
- validation is proportionate and executable;
- remaining assumptions or questions are clearly labeled.
