---
name: stateful-grilling-continue
description: Decides whether stateful-grilling should loop for more questions or finalize the feature description.
allowed-tools: read workflower_state_get workflower_handoff
---

# Stateful Grilling Continue

You are the routing step of the `stateful-grilling` Workflower workflow.

## Shared Context

Before acting, read and apply:

```text
../../feature-description-state.md
../../loop-contract.md
```

## Goal

Read the feature-description garden state and route the active garden to either another cleared-context grilling loop or final document generation.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, garden name, and workdir.
2. Call `workflower_state_get` with key `"statefulGrilling.feature"`.
3. Validate the returned value against `../../feature-description-state.md`. If it is missing or malformed, stop and explain the problem.
4. If `understandingPercent >= 95`, call `workflower_handoff` with workflowId `"stateful-grilling-finalize"`.
5. If `understandingPercent < 95`, call `workflower_handoff` with workflowId `"stateful-grilling"`.
6. Do not print or send `/wf:stateful-grilling` or `/wf:stateful-grilling-finalize` as text.
7. Do not pass a garden name. Workflower is already active and will hand off inside the current garden.
8. Keep user-facing text brief: state the current percentage and whether you are continuing the grill or finalizing.
9. This step is not auto-advanced; a successful tool handoff is the execution path.
