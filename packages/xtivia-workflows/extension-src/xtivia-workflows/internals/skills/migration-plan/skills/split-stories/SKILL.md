---
name: wp-migration-stories-split
description: Split an accepted XTIVIA migration implementation plan into ordered implementation-ready story files.
allowed-tools: read write bash workflower_state_get workflower_state_set
---

# WP Migration Stories Split

## Shared Context

Before acting, read and apply:

```text
../../garden-state-contract.md
../../migration-methodology.md
../../component-reuse-quality-bar.md
../../review-quality-bar.md
```

## Goal

Turn the accepted `implementation-doc.md` migration plan into ordered story files under `stories/`, then save a compact `wpMigrationStoryManifest` in Workflower garden state.

## Required inputs

Read these garden-state values first:

- `wpMigrationPlanPath`
- `wpMigrationPlanReview`

If `wpMigrationPlanPath` is missing, use the workflow kickoff prompt or pollen path for `implementation-doc.md`. Stop and report the blocker instead of inventing stories if the accepted plan cannot be read.

## Instructions

1. Use the workflow kickoff prompt for workflow id, workdir, pollen, and declared output path for `stories`.
2. Confirm `wpMigrationPlanReview` is present with `score >= 4`; if not, stop and report that story splitting requires an accepted migration plan.
3. Read `implementation-doc.md` and extract the implementation story outline, preserving the dependency/order decisions from the plan.
4. Create a `stories/` directory under the current workflow workdir.
5. Write one self-contained story file per story using zero-padded topological order, for example `stories/001-implement-hero-section.md`.
6. Each story file must be implementation-ready and include:
   - title and story id;
   - hard dependencies by story id only;
   - goal and vertical slice;
   - acceptance criteria grounded in visual/behavioral parity;
   - red/green/refactor instructions that start with a behavioral red test;
   - validation commands, including Playwright checks/scripts where practical;
   - blocked states and notes.
7. Keep each story small enough for one focused implementation/review loop. Do not create soft dependencies or split by technical layers.
8. Call `workflower_state_set` with key `wpMigrationStoryManifest` and a value matching `../../garden-state-contract.md`. Use absolute paths for every story `path`, and store only `id`, `title`, `path`, `dependencies`, and `status`.

## Completion

Do not report completion until the story files exist and `wpMigrationStoryManifest` is saved. Respond with the number of story files written and the first story id/path.
