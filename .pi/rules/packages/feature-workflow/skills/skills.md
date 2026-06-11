---
kind: rules
paths:
  - "packages/feature-workflow/skills/**/*"
summary: Installable new-feature workflow skills for feature discovery and issue publishing.
triggers:
  - new-feature workflow skill
  - new-feature-grill
  - new-feature-summary
  - new-feature-convert-to-issues-prep
  - new-feature-review-issues
  - new-feature-publish-issues
---

# Skills

Enter here when editing Markdown skill prompts for the `new-feature` workflow. These skills clarify a feature idea, summarize it into `feature-summary.md`, convert that summary into TDD-first issue outlines in `issues.md`, review the issue plan, and publish it with `gh`.

## Subdirectories

| Directory                              | When to enter                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `new-feature-grill/`                   | Changing how the first step clarifies the requested feature without writing files.     |
| `new-feature-summary/`                 | Changing how the workflow writes the retained conversation summary to `feature-summary.md`. |
| `new-feature-convert-to-issues-prep/`  | Changing how `feature-summary.md` becomes TDD-first GitHub issue outlines in `issues.md`. |
| `new-feature-review-issues/`           | Changing how `issues.md` is corrected for slicing, dependencies, labels, and TDD detail. |
| `new-feature-publish-issues/`          | Changing how reviewed issues are created with `gh` and recorded back into `issues.md`. |

## Package Rules

- Keep `allowed-tools` minimal and matched to each step's job.
- Resolve file paths from Workflower kickoff prompts first; only fall back to local artifact names when no absolute path is visible.
- Preserve the issue metadata shape expected by the review and publishing steps.
