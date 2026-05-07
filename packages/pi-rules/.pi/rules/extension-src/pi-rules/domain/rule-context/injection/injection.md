---
kind: rules
paths:
  - 'extension-src/pi-rules/domain/rule-context/injection/**/*'
summary: Formatting selected rule files into injected system-prompt context.
triggers:
  - injected project rules prompt
  - format injected context
  - rule context prompt
---

# Injection

Enter here when changing the text appended to the system prompt after routing selects rules. This module controls how parent summaries, full rules, truncation notices, and available inventories are presented to the model.

### Patterns & Conventions

- Preserve the instruction that injected rules are authoritative and should prevent unnecessary rule-system inspection during normal code tasks.
- Inventories are listed as available context, not injected by default.
- Respect configured full-rule character limits and make truncation explicit in the injected text.
