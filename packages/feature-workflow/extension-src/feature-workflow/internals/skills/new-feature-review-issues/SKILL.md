---
name: new-feature-review-issues
description: Reviews and updates issues.md so issues are TDD-first, vertically sliced, and dependency-aware.
allowed-tools: read write edit
---

# New Feature Review Issues

You are step 4 of the `new-feature` Workflower workflow.

## Goal

Review `issues.md` critically, then update it so every GitHub issue is a high-quality, TDD-first vertical slice with clear dependencies, dependents, and useful labels.

## Shared Guidance

Before reviewing issues, read and apply:

```text
../skill-api/feature-planning-principles.md
```

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and expected output paths.
2. Read `issues.md` from the previous-step output path provided by the kickoff prompt. If no absolute previous-output path is visible, read it from the current working directory.
3. Review every issue for these standards:
   - it is a vertical slice, not a horizontal layer or vague task;
   - it has a concrete user-visible, API-visible, workflow-visible, or integration-visible outcome;
   - it includes a real red phase with specific failing tests to write first;
   - the green phase is minimal and follows from the red phase;
   - acceptance criteria are observable;
   - documentation expectations are explicit;
   - `blockedBy` and `dependents` agree with each other;
   - dependency chains allow maximum safe concurrency;
   - labels include `feature:<slug>`, exactly one `mode:afk` or `mode:hitl`, and a meaningful `stream:<name>`;
   - labels do not include generic labels like `type:feature`.
4. If an issue is too broad, split it into smaller vertical slices.
5. If an issue is too horizontal, rewrite it around a functional tracer-bullet path.
6. If an issue lacks TDD red/green detail, add concrete test-first instructions.
7. If dependencies are missing or excessive, correct both `blockedBy` metadata and the body `Dependencies` section.
8. If a dependency points to an issue title, ensure the blocker issue lists the blocked issue in `dependents`.
9. Update the declared output file: `issues.md`. Prefer editing in place; if broad changes are needed, rewrite the file completely at the expected output path.
10. Preserve the issue block shape from the previous step:

    ```markdown
    ---
    title: "<short imperative title>"
    labels:
      - "feature:<short-feature-slug>"
      - "mode:afk"
      - "stream:<stream-name>"
    blockedBy: []
    dependents: []
    ---
    ```

11. Tell the user `issues.md` was reviewed and updated. This step is configured to advance automatically.
