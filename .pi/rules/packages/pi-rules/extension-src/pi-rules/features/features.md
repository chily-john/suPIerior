---
kind: rules
paths:
  - 'packages/pi-rules/extension-src/pi-rules/features/**/*'
summary: Operational extension workflows that sit above domain logic and below Pi adapters.
triggers:
  - feature workflow
  - rule maintenance feature
  - operational workflow
---

# Features

Enter here for behavior that orchestrates domain logic into an operational workflow without depending on Pi adapter APIs. Features may depend on `domain/` and `shared/`, but Pi commands/events should call into features rather than features importing `pi/`.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `rule-maintenance/` | Changing background rules-maintainer detection, queueing, prompts, protected scopes, logs, process launch, or status. |
