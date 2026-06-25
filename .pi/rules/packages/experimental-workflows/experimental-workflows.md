---
kind: rules
paths:
  - "packages/experimental-workflows/**/*"
summary: Experimental Workflower playground package for workflows that demonstrate engine patterns.
triggers:
  - experimental-workflows
  - counter workflow
  - counter-loop workflow
  - stateful-grilling workflow
  - stateful-grilling-finalize workflow
  - Workflower playground
  - garden-state loop
  - workflower_handoff loop
  - cleared interview loop
---

# Experimental Workflows

Enter here when changing the installable playground package for impractical or demonstration-oriented Workflower patterns. The package currently registers `counter`, `counter-loop`, `stateful-grilling`, and `stateful-grilling-finalize`, uses Workflower private skills, and depends on `@supierior/workflower`. Treat workflows here as engine-pattern examples: keep them small, explicit, and useful for validating orchestration behavior rather than product workflows.

## Subdirectories

| Directory        | When to enter                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `extension-src/` | Registering experimental workflows, changing their definitions, or editing bundled Workflower-only skills. |
| `scripts/`       | Changing dependency-cruiser or package-local lint behavior.                                            |
| `tests/`         | Verifying package exports, manifest skill exposure, workflow registration, or workflow skill contracts. |

## Package Rules

- Keep experimental workflow-only skills in `pi.workflowerSkills`; this package should not expose public `pi.skills` unless adding a non-Workflower skill is intentional.
- Keep the package ESM-only through `dist/index.mjs` and `dist/index.d.mts`.
- Validate runtime or packaging changes with package-local `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
