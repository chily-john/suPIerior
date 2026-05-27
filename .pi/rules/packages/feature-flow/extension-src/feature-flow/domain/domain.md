---
kind: rules
paths:
  - 'packages/feature-flow/extension-src/feature-flow/domain/**/*'
summary: Feature-flow domain rules for config, artifact paths, slugs, discovery models, and summaries.
triggers:
  - feature-flow config
  - feature slug
  - artifact paths
  - discovery questions
  - discovery model
  - feature templates
  - summarize discovery
---

# domain

`domain/` contains workflow rules that should remain usable without Pi command registration. Enter here for config defaults/merging, optional next-step handoff settings, locating `.pi/features` artifact paths, slug normalization, feature template discovery/loading, discovery model contracts/parsing/state, feature-flow phase state, or conversion of answers into feature context.

## Patterns & Conventions

- Keep this area free of Pi adapter imports; model integrations should implement `DiscoveryModelAdapter` outside `domain/`.
- `findNearestPiRoot` intentionally ignores the user's home `.pi`; artifact paths should target a project `.pi` or create one under the current working directory.
- Preserve slug sanitization as a filesystem-safety boundary when changing feature naming behavior.
- Validate model discovery output before converting it into queued TUI questions or feature context.
- Keep feature-flow phase state as pure data transitions for `input-ready`, `busy`, `rendering`, and `complete`; app code owns applying those states to the UI.
- Treat `.pi/feature-templates` files as optional custom handoff templates; fall back to the built-in default when none is selected.
- Prefer `.pi/settings.json` `featureFlow` config when present; keep legacy `.pi/feature-flow.config.json` as a fallback.
