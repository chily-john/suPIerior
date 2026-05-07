---
kind: rules
paths:
  - 'extension-src/**/*'
summary: Runtime TypeScript extension source for Pi packages.
triggers:
  - extension source
  - runtime extension behavior
  - Pi extension implementation
---

# Extension Source

Enter here when changing runtime behavior for a Pi extension. Keep package entrypoints outside this tree thin; implementation belongs in domain folders below.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `pi-rules/` | Changing hierarchical rules injection, commands, background maintenance, status tooling, or shared runtime state. |
