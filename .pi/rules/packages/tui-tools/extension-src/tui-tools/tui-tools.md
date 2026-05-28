---
kind: rules
paths:
  - "packages/tui-tools/extension-src/tui-tools/**/*"
summary: Main source module for reusable TUI domains and root exports.
triggers:
  - tui-tools root exports
  - TUI domain exports
  - question primitives export
---

# tui-tools source

The package root is the public aggregation point for reusable TUI domains. Enter here when changing root exports or adding a new reusable TUI domain.

## Patterns & Conventions

- Root `index.ts` should only re-export domain entrypoints.
- When adding a domain-level entrypoint, add the domain `index.ts`, re-export it from the package root, add a `tsup` entry, and add a matching subpath export in `package.json`.

## Subdirectories

| Directory  | When to enter                                                   |
| ---------- | --------------------------------------------------------------- |
| `domains/` | Adding or changing reusable TUI capabilities grouped by domain. |
