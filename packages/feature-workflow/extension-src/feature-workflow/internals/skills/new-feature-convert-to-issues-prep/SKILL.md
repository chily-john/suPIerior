---
name: new-feature-convert-to-issues-prep
description: Converts feature-summary.md into TDD-first, vertically sliced GitHub issue outlines in issues.md.
allowed-tools: read write
---

# New Feature Convert To Issues Prep

You are step 3 of the `new-feature` Workflower workflow.

## Goal

Read `feature-summary.md` and generate `issues.md`, a set of GitHub issue outlines that are independently useful, vertically sliced, dependency-aware, and written for strict red/green TDD implementation.

## Shared Guidance

Before drafting issues, read and apply:

```text
../skill-api/feature-planning-principles.md
```

## Instructions

1. Use the workflow kickoff prompt for the workflow id, name, workdir, previous outputs, and expected output paths.
2. Read `feature-summary.md` from the previous-step output path provided by the kickoff prompt. If no absolute previous-output path is visible, read it from the current working directory.
3. Create the declared output file: `issues.md`.
4. Write `issues.md` at the absolute expected output path shown in the kickoff prompt. If no absolute path is visible, write it relative to the current working directory.
5. Break work into vertical slices. Each issue should deliver the smallest practical functional piece that can be tested, documented, and reviewed on its own.
6. Each issue must be TDD-first:
   - include a red phase with the failing test(s) to add first;
   - include a green phase with the minimal implementation to pass those tests;
   - include refactor/documentation notes where relevant.
7. Prefer independent or concurrent slices when possible. Use dependency fields only when one slice truly cannot start until another is complete.
8. Include dependents as well as dependencies so issue readers understand downstream impact.
9. Include labels that are meaningful for GitHub issue creation:
   - `feature:<short-feature-slug>` for every issue;
   - exactly one of `mode:afk` or `mode:hitl`;
   - one `stream:<short-concurrency-stream>` label to indicate which issues can be worked concurrently;
   - package or area labels when clear, such as `pkg:feature-workflow` or `area:docs`.
10. Do not use generic labels like `type:feature`.
11. Use this exact Markdown shape for each issue block:

   ```markdown
   # Issues for <feature name>

   ---
   title: "<short imperative title>"
   labels:
     - "feature:<short-feature-slug>"
     - "mode:afk"
     - "stream:<stream-name>"
   blockedBy: []
   dependents:
     - "<title of issue that depends on this>"
   ---

   ## Outcome
   <What functional slice exists when this issue is done.>

   ## Vertical slice
   <Why this is independently useful and what user-visible or integration path it covers.>

   ## Red phase
   - [ ] Add failing test: <specific test>

   ## Green phase
   - [ ] Implement the smallest change that passes the red test.

   ## Acceptance criteria
   - [ ] <criterion>

   ## Documentation
   - [ ] <docs or README update, or "No documentation change required because ...">

   ## Dependencies
   - Blocked by: <None or issue titles>
   - Dependents: <None or issue titles>

   ## Agent notes
   <Relevant files, commands, risks, and implementation notes.>
   ```

12. Separate issue blocks with `---` metadata delimiters as shown. Keep titles unique and stable because dependency fields refer to titles.
13. Tell the user the file was written. This step is configured to advance automatically.
