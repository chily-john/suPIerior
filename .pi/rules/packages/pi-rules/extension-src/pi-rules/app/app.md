---
kind: rules
paths:
  - 'packages/pi-rules/extension-src/pi-rules/app/**/*'
summary: Composition-level configuration defaults and shared runtime state.
triggers:
  - pi-rules app config
  - extension runtime state
  - shared state
---

# App

App modules hold configuration defaults and turn-scoped state shared by Pi adapters, domain routing, and rule-maintenance features.

### Patterns & Conventions

- Keep config defaults centralized in `config.ts`.
- Keep state shape in `state.ts`; initialize mutable turn activity through rule-maintenance helpers.
- App may reference domain or feature types, but should not contain Pi adapter behavior.
