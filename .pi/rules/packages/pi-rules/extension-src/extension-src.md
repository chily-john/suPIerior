---
kind: rules
paths:
  - 'packages/pi-rules/extension-src/**/*'
summary: Runtime TypeScript extension source for the pi-rules package.
triggers:
  - extension source
  - runtime extension behavior
  - Pi extension implementation
---

# Extension Source

Enter here when changing runtime behavior for the Pi extension. Keep package entrypoints thin; implementation belongs in domain-oriented folders below.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `pi-rules/` | Changing hierarchical rules injection, commands, background maintenance, status tooling, or shared runtime state. |
