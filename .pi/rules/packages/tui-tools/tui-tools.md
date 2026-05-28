---
kind: rules
paths:
  - 'packages/tui-tools/**/*'
summary: Reusable npm package for Pi TUI primitives used by guided workflow packages.
triggers:
  - tui-tools
  - Pi TUI primitives
  - @supierior/tui-tools
  - reusable TUI package
---

# tui-tools

`@supierior/tui-tools` is the reusable package for extended Pi TUI functionality. Other workspace packages should depend on it when they need reusable TUI primitives instead of duplicating UI orchestration logic.

## Patterns & Conventions

- Keep the package Pi-aware through peer types, but keep reusable primitives independent from a specific workflow package where possible.
- Public API should remain available from the package root; add domain-level subpath exports only for coherent domains.
- Prefer structural changes that preserve behavior unless the user explicitly asks for behavior changes.

## Subdirectories

| Directory        | When to enter                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `extension-src/` | Adding or changing reusable TUI domains, public exports, or internal source organization. |
| `scripts/`       | Updating dependency-cruiser rules that enforce TUI domain boundaries.                     |
| `tests/`         | Adding or updating tests for reusable TUI primitives.                                     |
