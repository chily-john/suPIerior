---
kind: rules
paths:
  - "packages/dev-workflow/schemas/**/*"
summary: Placeholder schemas for possible future local workflow coordination.
triggers:
  - workflow schema
  - local task schema
  - future task record
---

# Schemas

Enter here only when designing local coordination formats that complement, not replace, GitHub Issues and Projects. Current schemas are placeholders for future ignored runtime coordination paths.

### Patterns & Conventions

- Keep schemas minimal and explicit about GitHub remaining the source of truth.
- Do not make optional project metadata required unless workflow automation actually needs it.
