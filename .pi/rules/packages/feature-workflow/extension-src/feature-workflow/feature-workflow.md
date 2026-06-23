---
kind: rules
paths:
  - "packages/feature-workflow/extension-src/feature-workflow/**/*"
summary: Feature workflow definitions and Pi extension entrypoint.
triggers:
  - newFeatureWorkflow
  - takeItAwayWorkflow
  - counterWorkflow
  - counterLoopWorkflow
  - new-feature workflow id
  - take-it-away workflow id
  - counter workflow id
  - counter-loop workflow id
  - feature-workflow entrypoint
---

# Feature Workflow Source

The package root exports `newFeatureWorkflow`, `takeItAwayWorkflow`, `counterWorkflow`, and `counterLoopWorkflow`. All package workflows clean up their workdirs on completion; the counter workflows keep completion in the current session and use the active garden's `counter` state key for loop handoffs. The extension entrypoint registers the root workflows once per process, then initializes the Workflower command runtime with the package URL so `pi.workflowerSkills` are loaded.

## Patterns & Conventions

- Use Workflower's public `registerWorkflow` API and runtime setup with `packageUrl: import.meta.url`; do not duplicate registry, command, or private-skill loading state here.
- Keep steps aligned with shipped skills and their declared output behavior.
- Preserve `new-feature` grill conversation context with `clearOnNext: false`; later artifact steps auto-advance through summary, issue prep, issue review, and issue publishing.
- Preserve `take-it-away` startup context with `clearOnStart: false`, then clear between summary, plan, plan review, implementation, and implementation review steps.
- `take-it-away` depends on Ruleplementor's `implementor` and `reviewer` skills being installed through package skills metadata.
- `counter` initializes garden state key `counter` with explicit step runtime settings, then hands off to `counter-loop`; `counter-loop` stays hidden from user `/wf:counter-loop` and repeats until the counter reaches its end value.
- If changing cleanup behavior, session-clearing flags, runtime settings, garden state, or `autoNext`, update the README smoke-test expectations and package tests together.
