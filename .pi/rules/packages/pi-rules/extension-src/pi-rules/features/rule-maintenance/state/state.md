---
kind: rules
paths:
  - "packages/pi-rules/extension-src/pi-rules/features/rule-maintenance/state/**/*"
summary: Persistent maintainer queue, active-run, lock, and log state under `.pi/.pi-rules/`.
triggers:
  - maintainer queue state
  - active runs
  - maintainer lock
  - maintainer log file
---

# State

Enter here when changing persisted maintainer coordination files. State helpers must be defensive because they mediate recovery from stale runs, dead PIDs, queued batches, and older lock formats.

### Patterns & Conventions

- Store maintainer state under `.pi/.pi-rules/` and create the directory on writes.
- Writing active runs should clear the legacy lock to avoid conflicting coordination models.
- Treat dead active runs and dead lock PIDs as recoverable; prune or clear them with log entries.
- Preserve deleted/renamed metadata and protected rule paths through queue writes.
