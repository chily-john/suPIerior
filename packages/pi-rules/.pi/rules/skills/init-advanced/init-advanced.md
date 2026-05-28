---
kind: rules
paths:
  - "skills/init-advanced/**/*"
summary: Interactive skill for bootstrapping `AGENTS.md` and mirrored `.pi/rules/` documentation.
triggers:
  - init advanced
  - bootstrap rules
  - create .pi/rules
  - root template
  - module template
---

# Init Advanced

This skill creates the documentation system for a project through reconnaissance, planning, source reading, a targeted interview, and documentation writes. Its templates define the expected shape of root context files, module rules files, and inventories.

### Patterns & Conventions

- Preserve confirmation gates before reading/writing and before proceeding after interview questions.
- Keep the skill focused on documentation only; it must not refactor or fix source code.
- Parent rules are sources of truth for cross-cutting facts, so the workflow must avoid duplicating parent content in child files.
- Template changes affect generated documentation quality across projects; keep them concise and decision-oriented.
