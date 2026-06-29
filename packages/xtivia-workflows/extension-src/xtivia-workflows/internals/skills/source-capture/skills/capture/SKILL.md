---
name: wp-migration-source-capture
description: Capture source page artifacts for an XTIVIA WordPress-to-Next.js page migration.
---

# WP Migration Source Capture

## Shared Context

Before acting, read and apply:

```text
../../garden-state-contract.md
../../migration-methodology.md
../../playwright-artifact-contract.md
```

## Goal

Use Playwright/browser automation from the target Next.js repository to preserve desktop, mobile, HTML, DOM, and image artifacts for the source WordPress page before migration planning begins.

## Required inputs

Read these values from Workflower garden state first:

- `wpMigrationSourceUrl`
- `wpMigrationTargetRoute`
- `wpMigrationNotes`

If any value is missing, fall back to the incoming `site-info.md` pollen/path from the workflow kickoff prompt and parse the corresponding sections. Do not guess missing values. If the garden state and `site-info.md` together still do not provide the source URL or target route/path, stop and ask for the missing value.

## Required outputs

Resolve every declared output path relative to the active workflow workdir and write the exact artifacts documented by `playwright-artifact-contract.md`:

- `page-capture.md`
- `capture/source-desktop.png`
- `capture/source-mobile.png`
- `capture/source.html`
- `capture/dom-summary.json`
- `capture/images.json`

## Capture instructions

1. Use the workflow kickoff prompt for workflow id, workdir, declared inputs/pollen, and declared outputs.
2. Read `wpMigrationSourceUrl`, `wpMigrationTargetRoute`, and `wpMigrationNotes` with `workflower_state_get`. Fall back to reading `site-info.md` only for missing values.
3. Inspect the target Next.js repository for existing Playwright support or browser automation conventions. Prefer project scripts or existing Playwright config. If no project convention exists, use an adaptable command such as `npx playwright` only when it is available in the target repository.
4. Do not install Playwright or add Playwright dependencies to `@supierior/xtivia-workflows`; Playwright belongs to the target Next.js project.
5. Capture the source page at desktop viewport `1440x900` and write `capture/source-desktop.png`.
6. Capture the same source page at mobile viewport `390x844` and write `capture/source-mobile.png`.
7. Save the rendered page HTML to `capture/source.html`.
8. Write `capture/dom-summary.json` with a concise structured summary of visible sections, headings, landmarks, navigation, calls to action, forms, and notable interactive elements.
9. Write `capture/images.json` with a concise structured inventory of image URLs, alt text, dimensions when available, and likely section/context.
10. Write `page-capture.md` with source URL, target route/path, notes or constraints, commands/tooling used, viewport coverage, links to all capture artifacts, and any caveats.
11. After `page-capture.md` is written, call `workflower_state_set` for `wpMigrationCapturePath` with the absolute path to `page-capture.md`.

## Clear failure behavior

Fail clearly instead of fabricating captures when a blocker prevents the required artifacts:

- If Playwright/browser automation is missing from the target Next.js repository and no usable `npx playwright` path is available, write `page-capture.md` documenting the missing tooling blocker and report that Playwright is missing.
- If `wpMigrationSourceUrl` is unreachable, times out, or returns an unexpected non-page response, write the reachable diagnostics in `page-capture.md` and report that the URL is unreachable.
- If authentication, authorization, bot protection, VPN, or other access control blocks capture, write the blocker and any safe observed status details in `page-capture.md` and ask for access rather than bypassing controls.
- If only some artifacts can be captured, preserve the successful artifacts, document exactly which required artifacts are missing in `page-capture.md`, and report the blocker.

## Completion

Do not report completion until `page-capture.md` exists at the declared absolute output path and `wpMigrationCapturePath` is saved. If capture succeeds, all required artifact files must exist. If capture is blocked, `page-capture.md` must document the blocker clearly before you stop.
