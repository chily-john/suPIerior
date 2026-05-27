---
kind: rules
paths:
  - 'packages/feature-flow/extension-src/feature-flow/pi/**/*'
summary: Pi adapter layer for registering the feature-flow command.
triggers:
  - registerFeatureCommand
  - /feature command registration
  - feature command idle
  - PiDiscoveryModelAdapter
---

# pi

`pi/` owns the Pi extension adapter for feature-flow. Enter here when changing command registration, command descriptions, runtime gating before the workflow starts, or Pi model integration.

## Patterns & Conventions

- Keep this layer thin: validate Pi runtime conditions, then delegate workflow behavior to `app/`.
- The `/feature` command currently starts only while the agent is idle and an active Pi model exists; preserve those guards unless the command's interaction model changes.
- `PiDiscoveryModelAdapter` is the production bridge to Pi model auth, completion, abort signal, and thinking-level settings.
