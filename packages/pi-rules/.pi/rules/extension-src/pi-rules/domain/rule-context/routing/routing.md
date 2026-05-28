---
kind: rules
paths:
  - "extension-src/pi-rules/domain/rule-context/routing/**/*"
summary: Prompt intent detection, glob matching, rule scoring, and selection policy.
triggers:
  - rule routing
  - select rules
  - trigger scoring
  - path mention matching
  - code edit intent
---

# Routing

Routing decides whether a prompt should receive rule context and which rule file is the best fit. It combines explicit path mentions, frontmatter triggers, summary/title tokens, parent summaries, and sibling inventory discovery.

### Patterns & Conventions

- Treat scoring constants and default selection limits as experimental; changes can alter user-visible injection behavior.
- Explicit path matches should override generic intent detection so path-targeted tasks receive context.
- Use pattern scope matching when a path may represent a directory that contains rule-covered files.
- Parent rules are summary-only routing context; full parent content should not be injected when a child rule is selected.
- Inventories are discoverable only when their paths align with the selected full rule.
