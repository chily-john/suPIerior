---
kind: rules
paths:
  - "packages/tui-tools/extension-src/tui-tools/domains/**/*"
summary: Reusable TUI capabilities organized as independently exported domains.
triggers:
  - tui-tools domain
  - add TUI domain
  - reusable TUI capability
---

# domains

Each major reusable TUI capability belongs in a domain directory. Enter here when adding a domain such as questions, footer/status tools, or another reusable TUI primitive family.

## Patterns & Conventions

- Use pseudo-domain-driven organization: each domain owns its feature implementations plus shared models/helpers.
- Do not flatten domain-specific models, helpers, or features into package-level folders.
- Prefer root and domain-level public entrypoints; do not add feature-level package exports unless there is a clear consumer need.

## Subdirectories

| Directory    | When to enter                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------- |
| `questions/` | Changing reusable guided-question queues, ask helpers, question models, or answer formatting. |
