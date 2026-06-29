---
name: wp-migration-plan-review
description: Review an XTIVIA migration implementation plan and route by structured garden state.
allowed-tools: read bash workflower_state_get workflower_state_set
---

# WP Migration Plan Review

## Shared Context

Before acting, read and apply:

```text
../../garden-state-contract.md
../../migration-methodology.md
../../playwright-artifact-contract.md
../../component-reuse-quality-bar.md
../../review-quality-bar.md
```

## Goal

Review `implementation-doc.md` for capture-grounded, architecture-aware WordPress-to-Next.js migration planning, then save a concise structured `wpMigrationPlanReview` object in Workflower garden state.

## Required inputs

Read `wpMigrationPlanPath`, `wpMigrationOriginalPlanPath`, `wpMigrationSiteInfoPath`, and `wpMigrationCapturePath` from garden state. Fall back to workflow kickoff pollen/output paths only when state is missing. Read `implementation-doc.md`, `site-info.md`, and the capture summaries before scoring when available.

## Instructions

1. Use the workflow kickoff prompt for workflow id, workdir, pollen, and artifact paths.
2. Read `implementation-doc.md` and verify that it uses `site-info.md` and Playwright capture artifacts.
3. Apply `review-quality-bar.md` and `component-reuse-quality-bar.md`.
4. Check that the plan includes desktop/mobile coverage, `.pi/rules` first behavior, verified source inspection, concrete component decisions, local content strategy, and POC-appropriate Playwright verification.
5. Confirm the first successful draft has been preserved: `wpMigrationOriginalPlanPath` should point to `implementation-doc.original.md` when available. If it is missing, include that as a required improvement unless the current plan clearly documents that planning was blocked before a complete first draft could be produced.
6. Score the plan from 1 to 5. Scores `>= 4` pass. When score < 4, include specific `requiredImprovements` that the next create/improve pass can act on.
7. Call `workflower_state_set` for `wpMigrationPlanReview` with this concise object shape:

```json
{
  "score": 4,
  "passes": true,
  "summary": "Short reason for the score.",
  "methodologyRatings": {
    "capture": 4,
    "visualParity": 4,
    "architecture": 4,
    "componentReuse": 4,
    "pocScope": 4
  },
  "requiredImprovements": [],
  "reviewedPath": "/absolute/path/to/implementation-doc.md"
}
```

7. Keep the garden-state summary short. Do not write a large review report unless the user explicitly asks.

## Completion

Do not report completion until `wpMigrationPlanReview` is saved. If the plan cannot be reviewed because required files are missing, save a failing review with score `1`, `passes: false`, a concise summary, and required improvements that identify the missing files.
