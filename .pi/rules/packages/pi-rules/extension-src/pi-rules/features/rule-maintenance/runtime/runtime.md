---
kind: rules
paths:
  - 'packages/pi-rules/extension-src/pi-rules/features/rule-maintenance/runtime/**/*'
summary: Maintainer subprocess launch, Pi CLI resolution, output parsing, and process lifecycle.
triggers:
  - maintainer subprocess
  - Pi spawn
  - process tree
  - maintainer output
---

# Runtime

Enter here when changing how the background maintainer process is spawned, monitored, parsed, or terminated. This layer owns safe Pi CLI resolution and parent/child process cleanup.

### Patterns & Conventions

- Resolve Pi to a non-shell Node CLI entrypoint on Windows; fail loudly when that cannot be done safely.
- Keep spawned maintainer processes owned by the parent Pi lifecycle; terminate the process tree on parent exit or explicit kill.
- Treat final JSON assistant output or `agent_end` as successful completion, then clean up the child process.
- Keep maintainer launch isolated with no ambient extensions, skills, context files, or unrelated tools.
