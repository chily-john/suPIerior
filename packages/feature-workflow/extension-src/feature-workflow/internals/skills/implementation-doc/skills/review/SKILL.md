---
name: implementation-doc-review
description: Reviews implementation-doc.md and saves a structured 1-5 methodology rating in garden state.
allowed-tools: read workflower_state_get workflower_state_set
---

# Implementation Doc Review

## Shared Context

Before acting, read and apply:

```text
../../implementation-doc-format.md
../../../feature-methodology.md
../../../garden-state-contract.md
```

## Goal

Critically review `implementation-doc.md` against the feature document and the feature workflow methodology. Save only structured review facts in garden state.

## Instructions

1. Use the workflow kickoff prompt for previous outputs and workdir.
2. Call `workflower_state_get` for `featureDocPath` and `implementationDocPath`.
3. Read both files. If `implementationDocPath` is missing, use the previous output path for `implementation-doc.md`.
4. Review for:
   - traceability to the feature doc;
   - strict behavioral-red TDD story design;
   - vertical slices rather than horizontal tasks;
   - a clear tracer-bullet strategy;
   - hard dependency labels and topological ordering;
   - acceptance criteria and validation commands;
   - story instructions suitable for a junior developer;
   - local architecture integration and blocked states.
5. Assign integer methodology ratings from 1-5 and an overall `score` from 1-5. Passing is `score >= 4`.
6. Call `workflower_state_set` with key `implementationDocReview` and the review object shape from `../../../garden-state-contract.md`. Save the whole object under `implementationDocReview`; do not save separate flat keys such as `implementationDocReview.score`.
7. Confirm the tool result is successful before saying the review was saved. If the tool fails, report the failure instead of claiming state was saved.
8. Do not edit `implementation-doc.md` and do not write a review file.
9. Respond with the score, pass/fail, and the main reason. This step is configured to advance automatically.
