---
kind: rules
paths:
  - 'extension-src/pi-rules/domain/rule-context/**/*'
summary: Foundational rule context domain for discovery, routing, and prompt injection formatting.
triggers:
  - rule context domain
  - rule context facade
  - hierarchical rules domain
---

# Rule Context

This domain owns `.pi/rules` discovery, route selection, glob matching, and injected-context formatting. It is foundational and must stay independent of Pi adapters and rule-maintenance process orchestration.

### Patterns & Conventions

- Export cross-boundary rule-context APIs through `index.ts` when possible.
- Keep Pi-specific types and UI behavior out of this domain.
- Do not import from `features/`; maintenance may depend on rule context, not the other way around.
