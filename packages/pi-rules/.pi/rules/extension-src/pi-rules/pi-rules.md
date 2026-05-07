---
kind: rules
paths:
  - 'extension-src/pi-rules/**/*'
summary: Core pi-rules extension wiring, configuration, and module boundaries.
triggers:
  - pi-rules extension
  - register hier rules
  - extension config
  - rule injection state
---

# Hier Rules

This module wires the extension together: app state/config, domain rule context, Pi adapters, and tools are composed from `index.ts`. Shared state is turn-scoped and includes the cached rule index, last rule selection, file activity during the turn, and git status snapshot/activity at turn start.

### Patterns & Conventions

- Keep `index.ts` as composition only; add behavior in the relevant child module.
- Treat injection scoring, default limits, and maintainer concurrency defaults as experimental behavior. Changes should be checked against realistic prompts, not just type correctness.
- Do not add source-specific rules here; path-scoped project documentation belongs under a consuming project's `.pi/rules/`.
- Enforce architecture boundaries with `npm run lint:deps` after moving cross-boundary imports: `shared` cannot import higher layers, `domain` cannot import `features` or `pi`, and `features` cannot import `pi`.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `app/` | Changing extension config defaults or shared runtime state. |
| `domain/rule-context/` | Changing `.pi/rules` discovery, routing, selection, or injected context formatting. |
| `features/rule-maintenance/` | Changing background maintenance detection, queueing, protected scopes, prompts, logs, or process launch. |
| `pi/commands/` | Adding or changing slash commands exposed by the extension. |
| `pi/events/` | Changing lifecycle hooks for rule indexing, injection, changed-file tracking, or maintainer startup. |
| `pi/tools/` | Adding or changing model-callable tools registered by the extension. |
| `pi/ui/` | Changing notifications or status indicators shown through Pi UI APIs. |
| `shared/` | Changing cross-module JSON, path, or text helpers. |
