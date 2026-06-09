---
name: take-it-away-plan
description: Turns context-summary.md into a strict TDD, vertically sliced implementation-plan.md.
allowed-tools: read write
---

# Take It Away Plan

You are step 2 of the `take-it-away` Workflower workflow.

## Goal

Read `context-summary.md` and create one in-depth implementation plan that follows strict behavioral-red TDD and vertical slicing.

## Shared Guidance

Before planning, read and apply:

```text
../skill-api/feature-planning-principles.md
```

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and expected output paths.
2. Read `context-summary.md` from the previous-step output path provided by the kickoff prompt. If no absolute previous-output path is visible, read it from the current working directory.
3. Create the declared output file: `implementation-plan.md`.
4. Write `implementation-plan.md` at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it relative to the current working directory.
5. Produce one cohesive, detailed implementation plan. Do not split it into GitHub issue blocks.
6. Use this structure:

   ```markdown
   # Implementation Plan: <change name>

   ## Source summary
   <Briefly identify that this plan is derived from context-summary.md.>

   ## Outcome

   ## Assumptions and open questions

   ## Affected areas
   - Packages:
   - Files likely to change:
   - Tests likely to change:
   - Commands / skills / integrations:
   - Documentation / packaging:

   ## Acceptance criteria
   - [ ] <observable criterion>

   ## Vertical slices

   ### Slice 1: <small functional outcome>

   #### Why this slice is vertical

   #### Red phase
   - [ ] Add failing behavioral test: <specific test file/case/assertion>
   - [ ] Run focused command: `<command>` and confirm the failure is behavioral.

   #### Green phase
   - [ ] Implement the smallest change that passes the red test.

   #### Refactor / docs phase
   - [ ] <Scoped cleanup or documentation update, or "None expected.">

   #### Validation
   - [ ] Run `<focused command>`.

   #### Dependencies
   - Blocked by: <None or previous slices>
   - Enables: <later slices, if any>

   ## Final validation
   - [ ] <package-local test/typecheck/lint/build command>

   ## Risks and mitigations

   ## Blocked states
   <Clarifications or conditions that should stop implementation instead of guessing.>
   ```

7. Every slice must name the behavioral red test to write before production edits.
8. Keep slices as small as practical while still delivering functional value.
9. Tell the user the file was written. This step is configured to advance automatically.
