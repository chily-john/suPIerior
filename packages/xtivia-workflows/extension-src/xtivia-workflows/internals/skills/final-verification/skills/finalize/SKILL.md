---
name: wp-migration-finalize
description: Verify the migrated Next.js route, preserve final screenshots, and write XTIVIA migration completion artifacts.
allowed-tools: read bash edit write workflower_state_get workflower_state_set
---

# WP Migration Finalize

## Shared Context

Before acting, read and apply:

```text
../../garden-state-contract.md
../../migration-methodology.md
../../playwright-artifact-contract.md
```

## Goal

Use the target Next.js project's Playwright/browser automation to verify the migrated route, capture final desktop and mobile target screenshots, compare source and target visual parity, and write concise completion artifacts for the migration workflow.

## Required inputs

Read these values from Workflower garden state first:

- `wpMigrationTargetRoute`
- `wpMigrationSourceUrl`
- `wpMigrationCapturePath`
- `wpMigrationPlanPath`
- `wpMigrationStoryManifest`

If required values are missing, fall back to the workflow kickoff prompt, pollen, or existing workflow artifacts only where they are explicitly available. Do not guess missing source or target route details.

## Required outputs

Resolve every declared output path relative to the active workflow workdir and write:

- `final-report.md`
- `verification/target-desktop.png`
- `verification/target-mobile.png`
- `rules-maintenance-suggestions.md`

## Verification instructions

1. Use the workflow kickoff prompt for workflow id, workdir, pollen, declared outputs, and current step context.
2. Check the working tree with `git status --short` before verification so unrelated human changes are visible and not overwritten.
3. Inspect the target project for existing Playwright support and route startup conventions. Prefer project scripts and existing Playwright config. Do not add Playwright dependencies to `@supierior/xtivia-workflows`.
4. Start or reuse the target Next.js dev/preview server according to local project conventions, then load `wpMigrationTargetRoute` in Playwright.
5. Verify the target route loads successfully: no unexpected HTTP failure, no obvious framework error page, and key visible content from the source capture / migration plan appears on the page.
6. Verify important images from the source capture or implementation plan are present on the target route with appropriate visible rendering and alt text where the target design expects it.
7. Capture desktop viewport `1440x900` to `verification/target-desktop.png`.
8. Capture mobile viewport `390x844` to `verification/target-mobile.png`.
9. Compare source and target desktop/mobile screenshots for close visual parity: section order, spacing, typography scale, imagery, navigation, and responsive behavior should be materially aligned. Do not require pixel-perfect diffs; document any acceptable intentional differences.
10. If Playwright is unavailable or the target route cannot be loaded, preserve any partial artifacts, write the blocker clearly in `final-report.md`, and do not claim implementation success.

## Completion artifacts

Write `final-report.md` with concise artifact-oriented sections:

- Source URL and target route
- Commands/tooling used for final verification
- Verification checks performed: route load, key content, important images, desktop/mobile screenshots, and source/target visual parity comparison
- Story summary from `wpMigrationStoryManifest`, including completed story ids/titles when available
- Links to `verification/target-desktop.png`, `verification/target-mobile.png`, and relevant source capture artifacts
- Known caveats, blockers, or acceptable visual differences
- Final status: implemented only when verification passes

Write `rules-maintenance-suggestions.md` with optional follow-up suggestions for `.pi/rules` maintainers based on lessons from the migration. Do not mutate .pi/rules. Write suggestions only, and say when no rule updates are recommended.

## Garden state

After successful final verification and after `final-report.md` exists, call `workflower_state_set` for:

- `wpMigrationFinalReportPath`: absolute path to `final-report.md`
- `wpMigrationStatus`: `"implemented"`

If verification is blocked or incomplete, write `final-report.md` with the blocker, do not set `wpMigrationStatus` to `"implemented"`, and report the blocker clearly.

## Completion

Do not report completion until the declared artifacts exist or a clear blocker has been documented in `final-report.md`. In the final response, include the files written, verification commands run, result, and whether the migration is ready for human/customer review.
