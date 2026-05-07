---
kind: rules
paths:
  - 'skills/**/*'
summary: Pi skills that bootstrap and maintain rules documentation.
triggers:
  - Pi skill
  - init advanced skill
  - rules maintainer skill
  - documentation skill
---

# Skills

Skills in this package are documentation workflows, not application implementation workflows. Enter here when changing how agents create or maintain `AGENTS.md` and `.pi/rules/` files.

### Patterns & Conventions

- Keep skill permissions aligned with the job: documentation bootstrap can write files; background maintenance should use minimal tools.
- Skills should explicitly forbid unrelated application-code changes.
- Hidden/background skills should not be surfaced as normal model-invoked workflows unless that is intentional.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `init-advanced/` | Changing the interactive bootstrap workflow, interview steps, or documentation templates. |
| `rules-maintainer/` | Changing the hidden post-edit rules update workflow or significance threshold. |
