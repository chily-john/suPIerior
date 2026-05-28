---
kind: rules
paths:
  - "packages/tui-tools/tests/**/*"
summary: Vitest coverage for reusable tui-tools domain features.
triggers:
  - tui-tools tests
  - question queue tests
  - askQueue tests
  - TUI primitives vitest
---

# tests

Enter here when adding or updating tests for reusable TUI primitives, including question prompt/loading widget behavior. Test paths should mirror source domains and features.

## Patterns & Conventions

- Mirror source architecture as `tests/domains/<domain>/<feature>/<feature>.test.ts`.
- Feature tests may import feature entrypoints directly.
- Add root or domain public API smoke tests only when export behavior itself needs coverage.

## Subdirectories

| Directory  | When to enter                                    |
| ---------- | ------------------------------------------------ |
| `domains/` | Testing behavior owned by a reusable TUI domain. |
