---
kind: rules
paths:
  - "extension-src/pi-rules/pi/commands/**/*"
summary: Slash command registration for initialization, status, context inspection, and maintainer control.
triggers:
  - pi-rules command
  - slash command
  - maintainer command
  - status command
---

# Commands

Commands are thin handlers that validate idle state and user input, then delegate formatting, UI, indexing, or maintenance work to domain modules.

### Patterns & Conventions

- Before commands that send a user message or start background maintenance, check `ctx.isIdle()` and warn instead of interrupting an active agent turn.
- Normalize explicit file arguments through shared path helpers before passing them to maintainer services.
- Keep command output formatting in `domain/rule-context`, `features/rule-maintenance`, or `pi/ui/presenter` rather than embedding presentation rules in command registration.
