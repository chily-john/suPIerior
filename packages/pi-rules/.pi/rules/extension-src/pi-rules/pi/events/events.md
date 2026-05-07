---
kind: rules
paths:
  - 'extension-src/pi-rules/pi/events/**/*'
summary: Pi lifecycle event handlers for rule injection and background maintenance triggers.
triggers:
  - before agent start
  - agent lifecycle event
  - tool result changed files
  - background maintainer event
---

# Events

Event modules bridge Pi lifecycle hooks to the rule-context domain and rule-maintenance feature. They should collect context, update extension state, and delegate work rather than implement routing or maintenance logic inline.

### Patterns & Conventions

- Use `session_start` for warming the rule index and `before_agent_start` for turn-scoped injection.
- Track turn file activity from successful tool results and git-status deltas between `agent_start` and `agent_end`.
- Resume queued maintenance on `session_start`; start new maintenance only after a turn ends.
- Do nothing when no changed files are detected.
- Filter detected files through rule `paths` before queueing maintenance; skip uncovered changes.
- Pass only covered deleted/renamed path metadata into maintenance runs.
