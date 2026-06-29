# Playwright Source Capture Artifact Contract

The `wp-migration-source-capture` step preserves the observable source WordPress page before migration planning. All artifacts are written under the active workflow workdir using the exact relative output paths declared by `wpPageMigrationWorkflow.steps[1]`.

## Required artifacts

- `page-capture.md`: concise capture report with source URL, target route/path, notes or constraints, capture timestamp, Playwright command or project script used, viewport coverage, artifact links, and any blockers or caveats.
- `capture/source-desktop.png`: desktop screenshot of the source page captured at `1440x900`.
- `capture/source-mobile.png`: mobile screenshot of the source page captured at `390x844`.
- `capture/source.html`: saved HTML for the loaded source page after client-side rendering settles enough for migration planning.
- `capture/dom-summary.json`: structured summary of the visible DOM sections, headings, landmark regions, links/buttons, forms, and notable interactive elements.
- `capture/images.json`: structured inventory of images discovered on the page, including source URL, alt text, dimensions when available, and likely page section/context.

## Runtime expectations

- Use Playwright/browser automation available in the target Next.js repository where the migration workflow is being run. The XTIVIA workflow package must not add a runtime Playwright dependency.
- Prefer the target project's existing Playwright config or scripts. If none exist, use an adaptable command such as `npx playwright` only when it works in the target repository.
- Capture both desktop and mobile viewports from the same `wpMigrationSourceUrl` and preserve artifacts before planning implementation stories.
- If the page cannot be captured because Playwright is missing, the URL is unreachable, or authentication/authorization blocks access, fail clearly in `page-capture.md` and the agent response instead of inventing artifacts.

## Garden state

After `page-capture.md` and any successful capture artifacts are written, save `wpMigrationCapturePath` as the absolute path to `page-capture.md`.
