---
name: implementation-doc-create
description: Creates or improves implementation-doc.md from feature-doc.md using TDD, vertical slicing, tracer bullets, and dependency ordering.
allowed-tools: read write edit workflower_state_get workflower_state_set
---

# Implementation Doc Create

## Shared Context

Before acting, read and apply:

```text
../../implementation-doc-format.md
../../../feature-methodology.md
../../../garden-state-contract.md
```

## Goal

Create or improve `implementation-doc.md` from the feature document. If a previous review exists in garden state, mutate the same implementation doc to address the review feedback.

## Instructions

1. Use the workflow kickoff prompt for workdir, incoming pollen paths, previous outputs, and expected output paths.
2. Call `workflower_state_get` for `featureDocPath`. If missing, use the incoming pollen path that points to `feature-doc.md`.
3. Read the feature doc.
4. Call `workflower_state_get` for `implementationDocReview`. If it exists and has `score < 4`, treat this run as an improvement pass and address `requiredImprovements` in the same `implementation-doc.md` file.
5. Write or edit the declared output file `implementation-doc.md` at the absolute expected output path. If the file already exists, mutate it in place.
6. Follow `../../implementation-doc-format.md` exactly enough that stories can later be split mechanically.
7. Design stories around strict behavioral-red TDD, vertical slicing, tracer-bullet methodology, and hard dependency labels.
8. Topologically order stories by dependencies.
9. Write every story as implementation-ready instructions for a junior developer.
10. Call `workflower_state_set` with key `implementationDocPath` and the absolute path to `implementation-doc.md`.
11. Respond concisely with the path written and whether this was a first draft or improvement pass. This step is configured to advance automatically.
