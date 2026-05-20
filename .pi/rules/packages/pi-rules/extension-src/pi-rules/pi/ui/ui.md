---
kind: rules
paths:
  - 'packages/pi-rules/extension-src/pi-rules/pi/ui/**/*'
summary: Presentation layer for notifications and Pi status indicators.
triggers:
  - UI presenter
  - status indicator
  - maintainer notification
  - rules selected status
---

# UI

The presenter centralizes notifications and status updates for commands and events. Enter here when changing how rule selection, maintainer progress, queueing, completion, or errors are surfaced to users.

### Patterns & Conventions

- Respect UI config flags before setting rule or maintainer statuses.
- Clear temporary maintainer statuses after completion or error so stale state is not displayed indefinitely.
- When a queued maintainer run starts immediately after completion, leave status ownership to the next run instead of showing completion.
- Keep user-facing text here rather than duplicating notification strings across commands and events.
