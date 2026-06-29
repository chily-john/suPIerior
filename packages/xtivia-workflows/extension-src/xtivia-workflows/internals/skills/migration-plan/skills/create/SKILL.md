---
name: wp-migration-plan-create
description: Create or improve an XTIVIA WordPress-to-Next.js migration implementation plan.
---

# WP Migration Plan Create

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

Write or improve `implementation-doc.md` for the current page migration using `site-info.md`, source capture artifacts, target-project rules, and verified target source inspection.

## Required inputs

Read these garden-state values first:

- `wpMigrationSiteInfoPath`
- `wpMigrationCapturePath`
- `wpMigrationPlanReview`

If the path values are missing, fall back to the workflow kickoff prompt and pollen paths for `site-info.md` and `page-capture.md`. If required artifacts are missing or unreadable, stop and report the blocker instead of inventing a plan.

## Instructions

1. Use the workflow kickoff prompt for workflow id, workdir, pollen, declared outputs, and expected output path for `implementation-doc.md`.
2. Read `site-info.md`, `page-capture.md`, and the capture artifact summaries named in `playwright-artifact-contract.md` when they exist.
3. If `wpMigrationPlanReview` exists with `score < 4`, treat this as an improvement pass and address every `requiredImprovements` item in the same `implementation-doc.md`.
4. Read injected `.pi/rules` and local target-project guidance before broad source searches.
5. Inspect target source files needed to verify routes, components, styling patterns, assets, and Playwright/test conventions. Do not rely on assumptions about the target project.
6. Write or edit `implementation-doc.md` with these sections:
   - Migration scope and source/target summary.
   - Capture evidence used, including desktop/mobile coverage and artifact paths.
   - Significant source page sections and visual/behavioral parity risks.
   - A section-by-section component reuse/build map that follows `component-reuse-quality-bar.md`.
   - Local content and asset strategy for the POC.
   - Implementation stories/dependency outline suitable for later story splitting.
   - POC-appropriate validation plan, including Playwright screenshots/checks where practical.
   - Open questions or blockers, if any.
7. Keep detailed planning content in `implementation-doc.md`; use garden state only for small routing facts.
8. After `implementation-doc.md` is written, call `workflower_state_set` for `wpMigrationPlanPath` with the absolute path to the file.

## Completion

Do not report completion until `implementation-doc.md` exists and `wpMigrationPlanPath` is saved. If planning is blocked by missing captures, missing target source access, or unclear architecture, write the blocker in `implementation-doc.md` when possible and report it clearly.
