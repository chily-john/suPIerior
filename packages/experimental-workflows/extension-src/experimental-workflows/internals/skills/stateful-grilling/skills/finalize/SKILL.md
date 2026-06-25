---
name: stateful-grilling-finalize
description: Writes the final feature-description.md artifact for the stateful-grilling workflow.
allowed-tools: read workflower_state_get write
---

# Stateful Grilling Finalize

You are the final document generation step of the `stateful-grilling-finalize` Workflower workflow.

## Shared Context

Before acting, read and apply:

```text
../../feature-description-state.md
../../loop-contract.md
```

## Goal

Create a final, detailed feature description that a human or implementation agent can understand and work from.

## Instructions

1. Use the workflow kickoff prompt for the workflow id, garden name, and workdir.
2. Call `workflower_state_get` with key `"statefulGrilling.feature"`.
3. Validate the returned value against `../../feature-description-state.md`. If it is missing or malformed, stop and explain the problem.
4. Write exactly one output file named `feature-description.md` in the current Workflower workdir from the kickoff prompt.
5. The document should be clear, implementation-ready Markdown. Include these sections when information is available:
   - Title
   - Summary
   - Problem / Opportunity
   - Target Users
   - User Goals
   - Scope In
   - Scope Out
   - Functional Requirements
   - Non-Functional Requirements
   - User Flows
   - Data and Integrations
   - Edge Cases and Error Handling
   - Acceptance Criteria
   - Constraints and Dependencies
   - Risks and Assumptions
   - Remaining Non-Blocking Questions
6. Do not include raw transcript excerpts. Convert state into polished, durable feature documentation.
7. If the understanding percentage is below `95`, include a short warning near the top explaining what is still incomplete, but still write the best available document.
8. After writing the file, report the path and the final understanding percentage.
9. This step is configured to advance automatically after the agent run completes.
