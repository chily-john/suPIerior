---
kind: rules
paths:
  - "packages/feature-workflow/**/*"
summary: Workflower package for turning feature ideas into GitHub issues or implementation plans.
triggers:
  - feature-workflow
  - new-feature workflow
  - take-it-away workflow
  - GitHub issue workflow
  - implementation-plan.md
  - new-feature-grill
  - new-feature-publish-issues
---

# Feature Workflow

Enter here when changing the installable workflow package that turns rough feature ideas into reviewed, TDD-first, vertically sliced GitHub issues or implementation plans. This package contributes the `new-feature` and `take-it-away` workflows and ships companion skills for grilling, summarizing, issue drafting, plan drafting, plan review, and GitHub issue publishing. It depends on `@supierior/workflower` and `@supierior/ruleplementor`; the publishing step expects the GitHub CLI.

## Subdirectories

| Directory        | When to enter                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `extension-src/` | Registering or changing workflow definitions exposed by the Pi extension entrypoint. |
| `scripts/`       | Changing dependency-cruiser boundaries or package-local lint behavior.                             |
| `skills/`        | Editing the `new-feature` workflow's installable skill prompts or their file-read/write permissions. |
| `tests/`         | Verifying package export, manifest, or workflow registration behavior.                             |

## Package Rules

- Keep workflow steps aligned with the artifacts documented in the README: `feature-summary.md`, `issues.md`, `context-summary.md`, `implementation-plan.md`, and `implementation-review.md`.
- The skill package is loaded through `package.json` `pi.skills`; keep feature-workflow and Ruleplementor skill directories publishable with the package.
- Validate changes with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` when touching runtime or packaging files.
