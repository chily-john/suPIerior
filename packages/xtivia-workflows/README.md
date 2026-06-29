# XTIVIA Workflows

`@supierior/xtivia-workflows` is a Pi Workflower package for XTIVIA WordPress-to-Next.js proof-of-concept page migrations. It guides an agent through collecting migration inputs, preserving source-page evidence, planning component reuse, implementing focused migration stories, and writing final verification artifacts.

## Where to run it

Run the workflow from inside the target Next.js project that will receive the migrated route, not from the `suPIerior` monorepo. The target project should already have Playwright installed and configured, or the workflow may need to add minimal target-project support or fail clearly with a documented blocker. Playwright is the browser layer used for source capture, route verification, and desktop/mobile screenshots.

Start a migration with:

```text
/wf:wp-page-migration <garden-name>
```

Example:

```text
/wf:wp-page-migration acme-homepage-poc
```

The public `wp-page-migration` workflow uses `cleanupOnCompletion: false`, so workflow artifacts are preserved after completion.

## First questions

The first step asks for three required values. Example answers:

1. **Source URL** — `https://www.example.com/services/cloud-migration/`
2. **Target route/path** — `/services/cloud-migration`
3. **Notes or constraints** — `POC scope only; reuse existing layout components; preserve hero CTA and services cards.`

The workflow saves these values to garden state for later private workflow loops.

## Artifact policy

Artifacts are stored under the active Workflower garden. The first public flower writes files under:

```text
.workflower/workflows/<garden-name>/0001-wp-page-migration/
```

Later private flowers write their own numbered directories under the same garden, such as migration-plan, story-split, story-implementation-loop, and finalize directories. Artifacts are preserved so reviewers can inspect the source evidence, the original and current implementation plans, story files, and final verification report.

Contract-critical artifacts include:

- `site-info.md`
- `page-capture.md`
- `capture/source-desktop.png`
- `capture/source-mobile.png`
- `capture/source.html`
- `capture/dom-summary.json`
- `capture/images.json`
- `implementation-doc.md`
- `implementation-doc.original.md` (first successful draft, preserved before review-loop improvements)
- `stories/`
- `final-report.md`
- `verification/target-desktop.png`
- `verification/target-mobile.png`
- `rules-maintenance-suggestions.md`

## Quality expectations

The workflow aims for close/manual visual parity rather than pixel-perfect diffs. Agents should compare section order, content, typography scale, spacing, imagery, navigation, and responsive behavior with desktop and mobile Playwright evidence.

Injected `.pi/rules` inventories are consumed as guidance for the target project, but this workflow does not automatically modify `.pi/rules`. Any lessons for maintainers belong in `rules-maintenance-suggestions.md`.

## Smoke commands

Most migration steps use `autoNext` so the workflow can run end-to-end automatically. The first site-info step still waits for manual `/next` after the user supplies source URL, target route/path, and notes.

Useful commands while running or checking a migration:

```text
/next
/wf status
/wf stop
/wf list
```
