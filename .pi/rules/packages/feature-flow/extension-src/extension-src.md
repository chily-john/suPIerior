---
kind: rules
paths:
  - "packages/feature-flow/extension-src/**/*"
summary: Source tree for the feature-flow Pi extension package.
triggers:
  - feature-flow source
  - feature-flow exports
  - feature-flow extension
---

# extension-src

Enter here for runtime source changes in `@supierior/feature-flow`. The source tree is organized around extension registration, workflow orchestration, pure domain helpers, and rendered artifact text.

## Subdirectories

| Directory       | When to enter                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `feature-flow/` | Changing the package entrypoint, `/feature` command behavior, workflow implementation, domain helpers, or templates. |
