---
name: implementation-stories-split
description: Splits accepted implementation-doc.md stories into implementation-ready story files and saves storyManifest in garden state.
allowed-tools: read write workflower_state_get workflower_state_set
---

# Implementation Stories Split

## Shared Context

Before acting, read and apply:

```text
../../implementation-doc-format.md
../../../feature-methodology.md
../../../garden-state-contract.md
```

## Goal

Turn the accepted `implementation-doc.md` stories into individual story markdown files for later one-at-a-time implementation.

## Instructions

1. Use the workflow kickoff prompt for workdir, incoming pollen paths, and expected output paths.
2. Call `workflower_state_get` for `implementationDocPath`. If missing, use incoming pollen or previous output paths pointing to `implementation-doc.md`.
3. Read `implementation-doc.md`.
4. Extract every story from the `## Stories` section.
5. Create a `stories/` directory under the current workflow workdir and write one file per story using zero-padded topological order, for example `stories/001-thin-tracer-bullet.md`.
6. Each story file must be implementation-ready for a junior developer and include:
   - title and story id;
   - hard dependencies by story id;
   - goal;
   - vertical slice;
   - acceptance criteria;
   - red/green/refactor instructions;
   - validation commands;
   - blocked states and notes.
7. Preserve the dependency order from the implementation doc. Do not create soft dependencies.
8. Call `workflower_state_set` with key `storyManifest` and a value matching `../../../garden-state-contract.md`. Use absolute paths for every story `path`.
9. Respond concisely with the number of story files written. This step is configured to advance automatically.
