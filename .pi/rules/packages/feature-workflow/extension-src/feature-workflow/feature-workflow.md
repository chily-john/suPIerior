---
kind: rules
paths:
  - "packages/feature-workflow/extension-src/feature-workflow/**/*"
summary: Feature workflow definitions and Pi extension entrypoint.
triggers:
  - newFeatureWorkflow
  - takeItAwayWorkflow
  - new-feature workflow id
  - take-it-away workflow id
  - feature-workflow entrypoint
---

# Feature Workflow Source

The package API exports `newFeatureWorkflow` and `takeItAwayWorkflow`. Both are five-step workflows that clean up their workdirs on completion. The extension entrypoint registers both once per process, then initializes the Workflower command runtime.

## Patterns & Conventions

- Use Workflower's public `registerWorkflow` API and default runtime setup; do not duplicate registry or command state here.
- Keep steps aligned with shipped skills and their declared output behavior.
- Preserve `new-feature` grill conversation context with `clearOnNext: false`; later artifact steps auto-advance through summary, issue prep, issue review, and issue publishing.
- Preserve `take-it-away` startup context with `clearOnStart: false`, then clear between summary, plan, plan review, implementation, and implementation review steps.
- `take-it-away` depends on Ruleplementor's `implementor` and `reviewer` skills being installed through package skills metadata.
- If changing cleanup behavior, session-clearing flags, or `autoNext`, update the README smoke-test expectations and package tests together.
