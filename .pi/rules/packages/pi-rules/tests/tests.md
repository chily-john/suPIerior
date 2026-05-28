---
kind: rules
paths:
  - "packages/pi-rules/tests/**/*"
summary: Vitest coverage for pi-rules runtime helpers and maintainer behavior.
triggers:
  - maintainer tests
  - vitest
  - test rule maintenance
---

# Tests

Enter here when adding or updating package tests. Existing tests focus on rule-maintenance helper behavior that is easy to regress while refactoring process orchestration.

## Subdirectories

| Directory     | When to enter                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `maintainer/` | Testing changed-file detection, bash path parsing, git-status parsing, or turn activity aggregation. |
