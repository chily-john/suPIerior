---
name: take-it-away-review-plan
description: Reviews and updates implementation-plan.md for strict TDD and vertical slicing.
allowed-tools: read write edit
---

# Take It Away Review Plan

You are step 3 of the `take-it-away` Workflower workflow.

## Goal

Review `implementation-plan.md` critically, then update it in place so it is ready for Ruleplementor's `implementor` skill.

## Shared Guidance

Before reviewing, read and apply:

```text
../skill-api/feature-planning-principles.md
```

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and expected output paths.
2. Read `implementation-plan.md` from the previous-step output path provided by the kickoff prompt. If no absolute previous-output path is visible, read it from the current working directory.
3. Review the plan for these standards:
   - it is fully traceable to `context-summary.md` and does not invent requirements;
   - it is one cohesive implementation plan, not GitHub issue metadata;
   - every slice is vertical and has a concrete functional outcome;
   - every slice starts with a valid behavioral red test before production edits;
   - green steps are minimal and follow from the red tests;
   - refactor and documentation steps are scoped and after green;
   - dependencies are necessary and preserve maximum safe concurrency;
   - acceptance criteria are observable;
   - validation commands are specific and proportionate;
   - blocked states are explicit enough for an implementor to stop rather than guess.
4. If a slice is too broad, split it into smaller vertical slices.
5. If a slice is too horizontal, rewrite it around a functional tracer-bullet path.
6. If a slice lacks TDD detail, add concrete test files, test cases, assertions, and focused commands when they can be inferred.
7. Update the declared output file: `implementation-plan.md`. Prefer editing in place; if broad changes are needed, rewrite the file completely at the expected output path.
8. Tell the user `implementation-plan.md` was reviewed and updated. This step is configured to advance automatically.
