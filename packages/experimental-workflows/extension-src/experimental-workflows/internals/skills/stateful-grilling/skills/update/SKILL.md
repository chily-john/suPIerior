---
name: stateful-grilling-update
description: Updates the feature-description garden state from the current stateful-grilling mini-conversation.
allowed-tools: read workflower_state_get workflower_state_set
---

# Stateful Grilling Update

You are the state update step of the `stateful-grilling` Workflower workflow.

## Shared Context

Before acting, read and apply:

```text
../../feature-description-state.md
../../loop-contract.md
```

## Goal

Merge the current mini-conversation into the durable feature understanding stored in garden state, then estimate how complete the understanding is.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, garden name, and workdir.
2. Call `workflower_state_get` with key `"statefulGrilling.feature"`.
3. Validate the returned value against `../../feature-description-state.md` when present.
4. Review the visible mini-conversation since the questioning step began. Extract durable feature facts, decisions, constraints, examples, and unresolved gaps. Do not store transcript text.
5. Merge new information into the existing state. Preserve prior durable facts unless the user corrected or superseded them.
6. Increment `iteration` by 1. If this is the first update, initialize `iteration` to `1`.
7. Estimate `understandingPercent` as an integer from 0 to 100:
   - use `95` or higher only when a human or implementation agent could confidently start from the description with minimal follow-up,
   - stay below `95` if core behavior, scope, data, UX flow, acceptance criteria, or implementation constraints remain materially unclear,
   - include a short `understandingRationale` explaining the estimate.
8. Refresh `openQuestions` with only the highest-impact remaining gaps. If `understandingPercent >= 95`, `openQuestions` should be empty or limited to non-blocking notes.
9. Call `workflower_state_set` with key `"statefulGrilling.feature"` and the updated value matching `../../feature-description-state.md`.
10. Briefly report the new percentage and the most important remaining gaps, if any. Do not ask new questions in this step.
11. This step is configured to advance automatically after the agent run completes.
