---
kind: rules
paths:
  - "packages/pi-rules/extension-src/pi-rules/**/*"
summary: Core extension wiring, configuration, domain modules, feature workflows, and Pi adapters.
triggers:
  - pi-rules extension
  - register hier rules
  - extension config
  - rule injection state
---

# Extension Runtime

This module wires app state, rule-context domain functions, rule-maintenance features, Pi adapters, and model-callable tools from `index.ts`. Shared state is turn-scoped: cached rule index, last selection, file activity during the turn, and git status snapshot/activity at turn start.

### Patterns & Conventions

- Keep `index.ts` as composition only; add behavior in the relevant child module.
- Treat injection scoring, default limits, and maintainer concurrency defaults as behavior-sensitive; verify realistic prompts when changing them.
- Do not add consuming-project rules here; project documentation belongs under the consuming repo's `.pi/rules/`.

## Subdirectories

| Directory                    | When to enter                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `app/`                       | Changing extension config defaults or shared runtime state.                                              |
| `domain/rule-context/`       | Changing `.pi/rules` discovery, routing, selection, or injected context formatting.                      |
| `features/rule-maintenance/` | Changing background maintenance detection, queueing, protected scopes, prompts, logs, or process launch. |
| `pi/`                        | Changing Pi API adapters for commands, lifecycle events, tools, or UI.                                   |
| `shared/`                    | Changing cross-module JSON, path, or text helpers.                                                       |
