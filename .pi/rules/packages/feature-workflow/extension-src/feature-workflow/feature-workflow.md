---
kind: rules
paths:
  - "packages/feature-workflow/extension-src/feature-workflow/**/*"
summary: Feature workflow definitions, Pi extension entrypoint, and bundled private skills.
triggers:
  - newFeatureWorkflow
  - takeItAwayWorkflow
  - featureDocWorkflow
  - implementationDocLoopWorkflow
  - implementationStoriesSplitWorkflow
  - storyImplementationLoopWorkflow
  - new-feature workflow id
  - take-it-away workflow id
  - feature-doc workflow id
  - implementation-doc-loop workflow id
  - story-implementation-loop workflow id
  - feature-workflow-route
  - feature-workflow entrypoint
---

# Feature Workflow Source

The package root exports `newFeatureWorkflow`, `takeItAwayWorkflow`, `featureDocWorkflow`, `implementationDocLoopWorkflow`, `implementationStoriesSplitWorkflow`, and `storyImplementationLoopWorkflow`. The extension entrypoint registers the workflows and `feature-workflow-route` command once per process, then initializes the Workflower command runtime with the package URL so `pi.workflowerSkills` are loaded from `internals/skills`.

## Subdirectories

| Directory      | When to enter                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `internals/`   | Editing Pi extension binding or bundled private skill prompts/contracts for feature workflows.       |
| `package-api/` | Changing exported workflow definitions, ids, step commands, outputs, pollen, model/thinking profiles, or auto-advance flags. |

## Patterns & Conventions

- Use Workflower's public `registerWorkflow` API and runtime setup with `packageUrl: import.meta.url`; do not duplicate registry, command, or private-skill loading state here.
- Keep steps aligned with shipped skills and their declared output behavior.
- Keep Workflower-only skill prompts grouped under `internals/skills/<domain>/skills/<step>/SKILL.md`; domain contracts and artifact formats stay beside each domain's `skills/` directory, with shared methodology and garden-state contracts at the skills root.
- Keep review skills writing structured `implementationDocReview` and `storyReview` objects in garden state; flat score keys are recovery fallback only.
- Preserve `new-feature` grill conversation context with `clearOnNext: false`; feature-doc creation auto-advances into `feature-workflow-route start-implementation-doc-loop`.
- Preserve `take-it-away` startup context with `clearOnStart: false`; it starts at feature-doc creation and then routes into the implementation-doc loop.
- Keep `implementation-doc-loop`, `implementation-stories-split`, and `story-implementation-loop` model-invocable but not user-invocable; route between them with `feature-workflow-route` and `workflower_handoff` instructions.
- Keep runtime profiles tiered: fast low defaults, medium doc/review/splitting/story-implementation steps, minimal routers, and high thinking for implementation-doc planning.
- If changing cleanup behavior, session-clearing flags, model/thinking profiles, loop routing, garden-state keys, or `autoNext`, update the README smoke-test expectations and package tests together.
