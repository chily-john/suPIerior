---
kind: rules
paths:
  - "packages/pi-rules/extension-src/pi-rules/features/rule-maintenance/reporting/**/*"
summary: User-facing maintainer status and log-tail formatting.
triggers:
  - maintainer status
  - maintainer log report
  - active run status
  - queue status
---

# Reporting

Enter here when changing how active maintainer runs, legacy locks, pending queue batches, protected scopes, and log paths are summarized for commands or UI notifications.

### Patterns & Conventions

- Report active runs before legacy locks; the legacy lock is compatibility state only when no active runs exist.
- Include protected rule paths in status output so overlapping-maintenance behavior is debuggable.
- Keep log reporting concise and delegate file reads to state helpers.
