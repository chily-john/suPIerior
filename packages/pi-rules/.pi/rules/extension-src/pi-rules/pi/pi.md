---
kind: rules
paths:
  - 'extension-src/pi-rules/pi/**/*'
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
