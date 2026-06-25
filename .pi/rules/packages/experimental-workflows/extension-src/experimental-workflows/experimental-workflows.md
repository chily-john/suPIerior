---
kind: rules
paths:
  - "packages/experimental-workflows/extension-src/experimental-workflows/**/*"
summary: Experimental workflow package entrypoint, Workflower definitions, Pi adapter, and private workflow skills.
triggers:
  - counterWorkflow
  - counterLoopWorkflow
  - statefulGrillingWorkflow
  - statefulGrillingFinalizeWorkflow
  - counter-loop userInvocable false
  - stateful-grilling-finalize userInvocable false
  - experimental-workflows entrypoint
  - private workflow skills
---

# Experimental Workflows Source

The package root exports `counterWorkflow`, `counterLoopWorkflow`, `statefulGrillingWorkflow`, `statefulGrillingFinalizeWorkflow`, and the default Pi extension setup. The extension registers all workflows once per process, then calls Workflower setup with `packageUrl: import.meta.url` so `pi.workflowerSkills` load from this package. Public workflows start from `/wf:<id>` commands; hidden continuation/finalization workflows are model-invokable only and repeat or finalize through `workflower_handoff`.

## Subdirectories

| Directory      | When to enter                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `internals/`   | Changing Pi extension binding or the bundled private skills/contracts used by experimental workflows. |
| `package-api/` | Changing exported workflow definitions, ids, step commands, model settings, or invocation flags. |

## Patterns & Conventions

- Register workflows through Workflower's public `registerWorkflow` API; do not duplicate registry or private-skill loading state here.
- Keep internal handoff workflows hidden from generated `/wf:<id>` commands with `userInvocable: false`; users start the public workflow and continuations run through handoff tools.
- Keep loop memory on Workflower garden state via `workflower_state_get` and `workflower_state_set`; do not introduce output files or pollen for intermediate loop state.
- If changing workflow ids, step ids, auto-advance, model settings, hidden-command behavior, or final outputs, update the README smoke test and package tests together.
