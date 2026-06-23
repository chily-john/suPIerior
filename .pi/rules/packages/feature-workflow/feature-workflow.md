---
kind: rules
paths:
  - "packages/feature-workflow/**/*"
summary: Workflower package for turning feature ideas into GitHub issues, implementation plans, or counter handoff tests.
triggers:
  - feature-workflow
  - new-feature workflow
  - take-it-away workflow
  - counter workflow
  - counter-loop workflow
  - GitHub issue workflow
  - implementation-plan.md
  - counter garden state
  - review-loop garden state
  - new-feature-grill
  - new-feature-publish-issues
---

# Feature Workflow

Enter here when changing the installable workflow package that turns rough feature ideas into reviewed, TDD-first, vertically sliced GitHub issues or implementation plans, and ships counter handoff workflows for Workflower smoke testing. This package contributes the `new-feature`, `take-it-away`, `counter`, and `counter-loop` workflows and ships companion skills for grilling, summarizing, issue drafting, plan drafting, plan review, GitHub issue publishing, and counter state handoffs. It depends on `@supierior/workflower` and `@supierior/ruleplementor`; the publishing step expects the GitHub CLI.

## Subdirectories

| Directory        | When to enter                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `extension-src/` | Registering or changing workflow definitions exposed by the Pi extension entrypoint. |
| `scripts/`       | Changing dependency-cruiser boundaries or package-local lint behavior.                             |
| `skills/`        | Editing the `new-feature` workflow's installable skill prompts or their file-read/write permissions. |
| `tests/`         | Verifying package export, manifest, or workflow registration behavior.                             |

## Package Rules

- Keep workflow steps aligned with the artifacts documented in the README: `feature-summary.md`, `issues.md`, `context-summary.md`, `implementation-plan.md`, and `implementation-review.md`.
- Use Workflower garden state for counter loop state and small review-loop routing facts; do not rely on workflow steps printing slash commands to execute routers.
- Keep `counter-loop` model-invocable but not user-invocable; users start `/wf:counter` and loop through `workflower_handoff`.
- Ruleplementor skills stay in `package.json` `pi.skills`; feature workflow-only skills stay in `pi.workflowerSkills` and must remain publishable with the package.
- Keep package root publishing ESM-only: `dist/index.mjs`, `dist/index.d.mts`, and no `require` export.
- Validate changes with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` when touching runtime or packaging files.
