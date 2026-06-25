---
kind: rules
paths:
  - "packages/feature-workflow/**/*"
summary: Workflower package for turning feature conversations into docs, plans, stories, and reviewed implementations.
triggers:
  - feature-workflow
  - new-feature workflow
  - take-it-away workflow
  - feature-doc workflow
  - implementation-doc-loop workflow
  - implementation-stories-split workflow
  - story-implementation-loop workflow
  - feature-doc.md
  - implementation-doc.md
  - storyManifest
  - review-loop garden state
  - feature-grill
  - feature-doc-create
---

# Feature Workflow

Enter here when changing the installable workflow package that turns feature conversations into durable feature docs, reviewed implementation docs, split story files, and reviewed story-by-story implementations. This package contributes the public `new-feature`, `take-it-away`, and `feature-doc` workflows plus private implementation loop workflows, and ships only private Workflower skills for grilling, feature-doc creation, implementation-doc creation/review, story splitting, story implementation, and story review.

## Subdirectories

| Directory        | When to enter                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `extension-src/` | Registering or changing workflow definitions, extension startup, or bundled Workflower-only private skills. |
| `scripts/`       | Changing dependency-cruiser boundaries or package-local lint behavior.                             |
| `tests/`         | Verifying package export, manifest, or workflow registration behavior.                             |

## Package Rules

- Keep workflow steps aligned with the artifacts documented in the README: `feature-doc.md`, `implementation-doc.md`, and `stories/`.
- Use Workflower garden state for small review-loop routing facts such as feature doc paths, review scores, attempts, story manifests, and current story; do not rely on workflow steps printing slash commands to execute routers.
- Keep `package.json` `pi.skills` empty for this package; all shipped workflow skills stay in `pi.workflowerSkills` and must remain publishable with the package.
- Keep package root publishing ESM-only: `dist/index.mjs`, `dist/index.d.mts`, and no `require` export.
- Validate changes with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` when touching runtime or packaging files.
