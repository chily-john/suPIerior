---
kind: rules
paths:
  - "packages/pi-rules/extension-src/pi-rules/features/rule-maintenance/**/*"
summary: Background rules-maintainer sub-agent queueing, locking, launch, logs, and prompts.
triggers:
  - rules maintainer
  - background maintenance
  - maintainer queue
  - maintainer lock
  - maintainer log
---

# Rule Maintenance

This feature owns the background documentation-maintenance runner. It filters changed files, schedules non-conflicting batches through `.pi/.pi-rules/`, launches Pi as a separate sub-agent, and exposes active-run/queue/lock/log status.

### Patterns & Conventions

- Preserve the separate sub-agent process so maintenance has its own context window and does not pollute the main task.
- Keep `.pi/` paths out of maintenance batches to avoid recursive rules maintenance.
- Use `TurnFileActivity` when merging changed/deleted/renamed paths and source metadata.
- Derive bash file activity conservatively; only report literal filesystem operands that can be normalized.
- Track active runs separately from the legacy lock and allow concurrent maintainers only when protected `.pi/rules` scopes do not overlap.
- Compute protected rule paths before launch and pass them into the maintainer prompt so each sub-agent edits only its reserved scope.
- Launch arguments intentionally disable ambient extensions, skills, and context files and pass the maintainer skill explicitly.
- Export cross-boundary maintenance APIs through `index.ts` when possible.
- Do not import from `pi/`; Pi adapters should call this feature instead.

## Subdirectories

| Directory    | When to enter                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| `reporting/` | Changing user-facing maintainer status or log-tail reporting.                                                 |
| `runtime/`   | Changing Pi process resolution, process-tree lifecycle, JSON output parsing, or maintainer subprocess launch. |
| `state/`     | Changing persisted queue, active-run, legacy lock, or log-file state under `.pi/.pi-rules/`.                  |
