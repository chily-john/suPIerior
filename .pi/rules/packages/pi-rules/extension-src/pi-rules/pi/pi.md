---
kind: rules
paths:
  - "packages/pi-rules/extension-src/pi-rules/pi/**/*"
summary: Pi extension API adapters for commands, lifecycle events, tools, and UI presentation.
triggers:
  - Pi adapter
  - ExtensionAPI
  - extension command event tool UI
---

# Pi Adapters

Pi modules adapt extension APIs to app state, rule-context domain functions, rule-maintenance features, and UI presentation. They are the only place Pi-specific context types and `ctx.ui` usage should normally appear.

### Patterns & Conventions

- Keep Pi handlers thin: validate context, update state, and delegate domain or feature work.
- Keep command contexts, `ExtensionAPI`, `ExtensionContext`, and UI calls inside `pi/` unless root composition requires otherwise.
- Do not move routing, discovery, injection formatting, or maintenance process logic into adapters.

## Subdirectories

| Directory   | When to enter                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `commands/` | Adding or changing slash commands exposed by the extension.                                          |
| `events/`   | Changing lifecycle hooks for rule indexing, injection, changed-file tracking, or maintainer startup. |
| `tools/`    | Adding or changing model-callable tools registered by the extension.                                 |
| `ui/`       | Changing notifications or status indicators shown through Pi UI APIs.                                |
