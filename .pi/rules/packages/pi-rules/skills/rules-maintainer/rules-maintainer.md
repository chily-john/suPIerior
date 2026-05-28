---
kind: rules
paths:
  - "packages/pi-rules/skills/rules-maintainer/**/*"
summary: Hidden skill for updating existing `.pi/rules` files after significant source changes.
triggers:
  - rules maintainer skill
  - update rules after edit
  - significance threshold
  - background maintenance prompt
---

# Rules Maintainer

This hidden skill evaluates changed files and updates matching existing rules or inventory files only when the public documentation surface changed. It must skip silently for trivial implementation, style, copy, or internal-only changes.

### Patterns & Conventions

- Derive source-to-rules mapping from `.pi/rules` frontmatter instead of hardcoding project paths.
- Prefer the most specific matching rules file, and prefer inventories for add/remove/list bookkeeping.
- Do not create new rules files during maintenance; initialization or explicit documentation work should do that.
- Keep updates minimal and preserve accurate existing content.
