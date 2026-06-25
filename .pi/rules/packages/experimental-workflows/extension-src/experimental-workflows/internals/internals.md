---
kind: rules
paths:
  - "packages/experimental-workflows/extension-src/experimental-workflows/internals/**/*"
summary: Internal Pi adapter and private skills for experimental workflows.
triggers:
  - counter private skill
  - stateful-grilling private skill
  - counter garden state contract
  - stateful-grilling feature state contract
  - loop handoff contract
  - experimental workflows pi adapter
  - counter-init
  - counter-start-loop
  - counter-increment
  - counter-continue
  - stateful-grilling-ask
  - stateful-grilling-update
  - stateful-grilling-continue
  - stateful-grilling-finalize
---

# Internals

Enter here when changing experimental workflow private prompts, their shared contracts, or the Pi adapter that binds the package to Workflower. The skills are examples for tool-driven handoff loops and garden state, so keep their instructions explicit about tool calls and validation.

## Subdirectories

| Directory      | When to enter                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `pi-adapter/`  | Changing extension setup, workflow registration idempotency, or package URL handoff to Workflower setup. |
| `skills/`      | Editing workflow private skills, shared state shape, loop handoff rules, or final artifact instructions. |

## Patterns & Conventions

- Shared state and loop rules belong in the workflow's contract files; skill prompts should reference those files instead of restating the full contract.
- Private skills must call Workflower tools for state and handoff; assistant text that prints `/wf:<id>` is not an execution path.
- Validate garden state every time a skill reads it, and stop with a clear error when it is absent or malformed.
- Keep stateful-grilling finalization writing only `feature-description.md` and preserving the final flower for the artifact.
