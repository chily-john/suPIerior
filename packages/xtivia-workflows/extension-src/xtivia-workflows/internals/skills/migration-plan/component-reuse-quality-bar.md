# Migration Plan Component Reuse Quality Bar

Every migration plan must include a section-by-section component reuse/build map. Treat each significant visible source page section as a deliberate implementation decision, not an implicit route-file dump.

For each significant source page section, classify the target implementation as exactly one of:

- **reuse existing**: an existing target-project component fits without meaningful changes.
- **extend existing**: an existing component should be enhanced while preserving its current callers.
- **create new reusable**: the page needs a new component that is likely reusable beyond this route.
- **route-local one-off**: the section is genuinely specific to this route and should stay local.

Each classification needs a short justification that cites the inspected target files or the explicit reason inspection was blocked. Prefer reuse and small extensions when they preserve architecture, but do not force reuse when it would make visual parity harder or create a misleading abstraction.
