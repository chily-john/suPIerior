---
kind: rules
paths:
  - "extension-src/pi-rules/features/rule-maintenance/**/*"
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

- Preserve the separate sub-agent process: it avoids recursion and gives maintenance its own context window so the main task is not polluted.
- Keep `.pi/` paths out of maintenance batches; rules changes should not trigger recursive maintenance.
- Use `TurnFileActivity` when merging changed/deleted/renamed paths or source metadata before maintenance filtering.
- Preserve covered deleted/renamed path metadata through the queue and maintainer prompt.
- Derive tool activity conservatively; bash tracking should only report literal filesystem operands it can normalize.
- Track active runs separately from the legacy lock and allow concurrent maintainers only when their protected `.pi/rules` scopes do not overlap.
- Compute protected rule paths before launch and pass them into the maintainer prompt so each sub-agent edits only its reserved scope.
- Reserve sibling rule and inventory files together when a changed file maps to a rule directory.
- Treat stale active runs or legacy locks as recoverable state; status and kill commands must leave the queue able to continue.
- Launch arguments intentionally disable ambient extensions/skills/context and pass the maintainer skill explicitly.
- Resolve Pi to a non-shell Node CLI entrypoint; fail loudly when the maintainer cannot be spawned safely.
- Treat final JSON assistant output or `agent_end` as successful completion, then clean up the child process.
- Keep spawned maintainer processes owned by the parent Pi lifecycle; terminate the process tree on parent exit or explicit kill.
- Export cross-boundary maintenance APIs through `index.ts` when possible.
- Do not import from `pi/`; Pi adapters should call into this feature instead.
