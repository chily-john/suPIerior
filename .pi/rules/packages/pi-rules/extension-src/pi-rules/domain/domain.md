---
kind: rules
paths:
  - "packages/pi-rules/extension-src/pi-rules/domain/**/*"
summary: Pi-independent domain logic for rules discovery, routing, and injected context formatting.
triggers:
  - domain layer
  - rule context domain
  - Pi independent logic
---

# Domain

Enter here when changing foundational logic that should not know about Pi UI, commands, events, or maintenance process orchestration. Domain code may be used by features and Pi adapters, but must not depend on them.

## Subdirectories

| Directory       | When to enter                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `rule-context/` | Changing discovery, glob matching, prompt intent/routing, selection policy, or injection formatting for `.pi/rules`. |
