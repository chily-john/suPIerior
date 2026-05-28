---
kind: rules
paths:
  - "packages/feature-flow/extension-src/feature-flow/**/*"
summary: Main source module for the `/feature` workflow extension.
triggers:
  - runFeatureWorkflow
  - feature-flow entrypoint
  - feature-flow command
---

# feature-flow source

The package entrypoint registers the Pi extension and re-exports selected workflow/domain APIs. Keep root exports intentional; do not expose internal templates or adapters unless a consumer needs them.

## Patterns & Conventions

- Use configured path aliases for cross-area imports: `@app`, `@domain`, `@pi`, and `@templates`.
- Keep domain and template code independent from Pi registration; dependency-cruiser enforces that they do not import `pi/`.
- Keep production Pi model integration in `pi/`; domain code should depend only on the discovery adapter contract.

## Subdirectories

| Directory    | When to enter                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`       | Changing end-to-end workflow sequencing, model-backed discovery, UI prompts, artifact writes, replacement behavior, or coordination with `tui-tools`. |
| `domain/`    | Changing configuration, slug, path, discovery model, model-response parsing, or summary behavior.                                                     |
| `pi/`        | Changing Pi command registration or command gating behavior.                                                                                          |
| `templates/` | Changing generated `feature.draft.md`, `feature.md`, `plan.md`, or prompt text.                                                                       |
