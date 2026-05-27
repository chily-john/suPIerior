---
kind: rules
paths:
  - 'packages/feature-flow/**/*'
summary: Pi workflow package for the `/feature` command and feature/plan artifact generation.
triggers:
  - feature-flow
  - /feature command
  - feature discovery workflow
  - feature artifacts
  - @supierior/feature-flow
---

# feature-flow

`@supierior/feature-flow` owns the guided feature discovery workflow. Enter here when changing the `/feature` command, model-backed discovery, optional kanban handoff, or how `.pi/features/<slug>/feature.md` and `plan.md` are generated.

## Patterns & Conventions

- Keep reusable TUI question behavior in `@supierior/tui-tools`; this package should compose those primitives for the feature workflow.
- Use `@supierior/kanban-converters` for post-plan kanban conversion instead of embedding publisher logic in the workflow package.
- Preserve the extension package boundary: Pi registration and model integration belong under `pi/`, workflow orchestration under `app/`, feature rules and discovery contracts under `domain/`, and generated text under `templates/`.
- Package validation mirrors other extension packages: build with `tsup`, test with Vitest, typecheck with `tsc --noEmit`, and lint dependency boundaries with dependency-cruiser.
- Keep Pi runtime packages as peer dependencies and externalized from the bundled extension output.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `extension-src/` | Changing runtime package exports, command registration, workflow orchestration, domain rules, or artifact templates. |
| `scripts/` | Changing dependency-boundary lint rules for this package. |
| `tests/` | Adding or updating tests for feature-flow domain behavior and workflow orchestration. |
