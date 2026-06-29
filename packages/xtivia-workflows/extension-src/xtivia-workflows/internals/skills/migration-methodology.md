# XTIVIA WordPress Page Migration Methodology

Build the smallest Next.js page migration that proves visual and behavioral parity for one source page while fitting the target codebase.

## Principles

- Capture first with Playwright in the target project: preserve desktop/mobile screenshots, source HTML, DOM summary, and image metadata before planning implementation.
- Plan from visible page sections and target architecture, not from assumptions about WordPress internals.
- Treat visual parity as the main POC quality bar. Use Playwright screenshots/checks where practical, but do not require automatic pixel-perfect diffs by default.
- Read injected `.pi/rules` and local component inventories before broad source searches. Verify source files only as needed.
- Prefer existing target components and patterns. Extend existing components when appropriate; create new reusable components only when justified by the page structure.
- Avoid giant route files and dumping-ground folders. Keep route-local code local when it is truly one-off.
- Do not add CMS integration, WordPress data loading, or generic content platforms for this POC unless explicitly requested.
- Do not automatically mutate `.pi/rules`; final workflow output may suggest rule maintenance separately.
- Preserve uncertainty. Stop and ask when source access, authentication, missing Playwright support, or target architecture is unclear.

## Review posture

Review plans and story implementations for capture use, desktop/mobile parity, architecture fit, component reuse decisions, POC-appropriate scope, and clear validation evidence.
