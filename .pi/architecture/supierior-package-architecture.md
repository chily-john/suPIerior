# suPIerior Package Architecture Notes

## Purpose

This document applies the project-agnostic AI-navigable folder architecture pattern to suPIerior packages.

General pattern:

@.pi/architecture/ai-navigable-folder-architecture.md


This file is intentionally project-specific. It may name suPIerior packages, Pi adapters, package conventions, and monorepo expectations.

## Current Direction

For TypeScript Pi extension packages, prefer a structure with public package surface at the top and implementation details beneath an internal folder.

Preferred shape:

```text
extension-src/<package-name>/
├── index.ts
├── package-api/
└── internals/
    ├── pi-adapter/
    └── <capability>/
```

This is not yet a mandatory rule for every package. It is the current target direction to refine through Workflower first, then adapt package-by-package.

## suPIerior-Specific Principles

1. Package-root exports are public package surface.
2. Public package exports should live near the top in `package-api/`.
3. Pi runtime interaction should usually live under `internals/pi-adapter/` when it has meaningful command, event, lifecycle, or session behavior.
4. Package logic should live under `internals/<capability>/`, where `<capability>` is a domain capability name rather than a generic layer name.
5. Use `internals/logic/` only when there is one obvious capability and no better domain name.
6. Public workflow/rule/converter/feature contracts should be near the top in `package-api/` or an equivalent public-facing folder.
7. Internal use cases should be grouped by domain action, not by generic app/domain/templates folders.
8. Dedicated type files should be explicit, for example `workflow-definition.types.ts`, `active-state.types.ts`, or `converter-contract.types.ts`.
9. Package-local dependency-cruiser rules should enforce package-specific import direction.
10. Repo-wide dependency-cruiser rules should eventually prevent one package from importing another package's internals.

## Public API Folder Guidance

Use `package-api/` for files that define the package's external import surface.

`package-api/` is a source organization folder, not a second public filesystem API. Other packages should normally import through the package root or package export map, not by reaching directly into `package-api/` paths.

Small public-facing support files may live in `package-api/` when they clarify the exported interface, but this should remain rare and small. Large implementations should not live there. Keep the public interface shallow and move implementation down into `internals/`.

Any non-exported support file in `package-api/` should have an explicit justification in code review or an architecture note. This prevents `package-api/` from drifting into a convenient place for implementation details.

Preferred:

```text
package-api/
├── register-workflow.ts
└── workflow-definition.types.ts
```

Avoid:

```text
package-api/
├── register-workflow.ts
├── global-workflow-registry.ts
├── active-state-store.ts
└── filesystem-cleanup.ts
```

The second shape makes `package-api/` carry implementation detail instead of package surface.

## Dependency Constraints Direction

Package-local dependency-cruiser constraints should enforce the package's internal architecture.

They should also protect folder-level privacy. Sibling use cases should not import each other's private helper files; shared code should move to a shared sibling location or be exposed through a deliberate folder-level interface.

Typical package-local constraints:

```text
internals/<capability>/* must not import internals/pi-adapter/*
internals/* must not import index.ts
shared runtime modules must not import use cases that consume them
sibling use cases must not import each other's private helper files
```

Repo-wide constraints should focus on cross-package privacy:

```text
packages/<a>/* must not import packages/<b>/extension-src/**/internals/*
packages/<a>/* must import packages/<b> through its package export surface
```

Use both mechanisms when possible:

1. package exports define the official public surface for consumers; and
2. dependency-cruiser catches source-level privacy violations during development, including relative-path imports that bypass package exports.

Dependency-cruiser is the better active guardrail. Package exports are still useful, but they mainly protect compiled/package consumption rather than every monorepo source import path.

## Workflower Target Shape

Workflower should be the first package to apply this pattern.

Target source shape:

```text
packages/workflower/extension-src/workflower/
├── index.ts
├── package-api/
│   ├── register-workflow.ts
│   └── workflow-definition.types.ts
└── internals/
    ├── pi-adapter/
    │   ├── register-extension.ts
    │   ├── commands/
    │   │   ├── wf-command.ts
    │   │   ├── next-command.ts
    │   │   └── generated-start-commands.ts
    │   └── events/
    │       ├── auto-next-on-agent-end.ts
    │       └── scoped-context-on-context-request.ts
    └── workflow-orchestration/
        ├── definitions/
        │   ├── registry/
        │   │   ├── global-registry.ts
        │   │   └── registry.types.ts
        │   └── validation/
        │       └── workflow-id-validation.ts
        ├── runtime/
        │   ├── use-cases/
        │   │   ├── start/
        │   │   │   ├── start-workflow.ts
        │   │   │   ├── initialize-workflow-session.ts
        │   │   │   ├── parse-start-args.ts
        │   │   │   └── start.types.ts
        │   │   ├── advance/
        │   │   │   ├── advance-workflow.ts
        │   │   │   ├── complete-workflow.ts
        │   │   │   └── advance.types.ts
        │   │   └── manage-active/
        │   │       ├── show-status.ts
        │   │       ├── list-active.ts
        │   │       ├── stop-active.ts
        │   │       └── manage-active.types.ts
        │   ├── active-state/
        │   │   ├── active-state-store.ts
        │   │   ├── active-state-paths.ts
        │   │   └── active-state.types.ts
        │   └── artifacts/
        │       ├── artifact-paths.ts
        │       ├── workflow-name-validation.ts
        │       └── remove-artifacts.ts
        └── prompting/
            └── step-kickoff/
                ├── render-step-kickoff-prompt.ts
                ├── render-output-paths.ts
                └── step-kickoff.types.ts
```

`workflow-orchestration/` is the chosen Workflower capability name because Workflower's core behavior is not just workflow data; it orchestrates registered definitions, active runtime state, artifacts, prompting, and step advancement.

## Workflower Import Direction

Preferred direction:

```text
index.ts
  -> package-api/register-workflow.ts
  -> package-api/workflow-definition.types.ts
  -> internals/pi-adapter/register-extension.ts

package-api/register-workflow.ts
  -> internals/workflow-orchestration/definitions/registry/global-registry.ts

internals/pi-adapter/*
  -> internals/workflow-orchestration/runtime/use-cases/*
  -> internals/workflow-orchestration/definitions/registry/*

internals/workflow-orchestration/runtime/use-cases/*
  -> internals/workflow-orchestration/runtime/active-state/*
  -> internals/workflow-orchestration/runtime/artifacts/*
  -> internals/workflow-orchestration/prompting/*
  -> internals/workflow-orchestration/definitions/*
```

Forbidden direction:

```text
internals/workflow-orchestration/* -> internals/pi-adapter/*
internals/* -> index.ts
other packages -> packages/workflower/extension-src/workflower/internals/*
```

## Pi Adapter Command Structure

Pi adapter commands should usually be split one command interaction point per file, even when the handlers are initially small.

Keep tightly coupled command registration or shared lifecycle code together when splitting would create shallow pass-through modules. The goal is to make command interaction points obvious, not to maximize file count.

Preferred:

```text
internals/pi-adapter/commands/
├── wf-command.ts
├── next-command.ts
└── generated-start-commands.ts
```

Avoid grouping unrelated command handlers into a single file only because they are currently short. The one-command-interaction-point-per-file rule makes command interaction points obvious to an AI navigator.

## Path Aliases

Prefer package-local TypeScript path aliases for major architecture areas. Aliases make import intent visible and allow dependency-cruiser constraints to describe architecture seams clearly.

Use aliases for major seams, not for every implementation subfolder. Prefer relative imports for direct local dependencies inside a use-case folder. Dependency-cruiser should prevent aliases from becoming a way to bypass module privacy.

For Workflower, candidate aliases include:

```text
@package-api/* -> extension-src/workflower/package-api/*
@pi-adapter/* -> extension-src/workflower/internals/pi-adapter/*
@orchestration/* -> extension-src/workflower/internals/workflow-orchestration/*
```

Avoid overly granular aliases for every nested folder. Broad aliases such as `@orchestration/*` should not imply that every nested helper file is public to the package. Import from front-door files where a folder represents a module.

## Markdown-Only Skill Packages

Markdown-only skill packages should have an analogous public/internal split when they contain more than a single `SKILL.md` and a small number of directly referenced support files.

Suggested shape:

```text
skill-root/
├── SKILL.md
├── skill-api/
└── internals/
```

Use `skill-api/` for documents the skill intentionally exposes or references as stable instructions. Use `internals/` for examples, templates, checklists, or implementation notes that support the skill but are not the primary public instruction surface.

For very small skills, do not create empty architecture folders. Add the split when the skill starts accumulating support material and navigability would improve.

## Tests

Do not restructure tests only to mirror source architecture. Mirror source structure only when it immediately improves test navigability or lets tests target a deep module interface more clearly.

For Workflower, existing scenario-style tests may remain until the source refactor reveals clearer deep module test seams.

## Dependency-Cruiser Timing

Add or update architecture constraints before moving Workflower files. The constraints should guide the refactor rather than merely document the end state.

Repo-wide cross-package internals privacy can be enforced now because packages should not import another package's `internals/` folder.

## Open Design Questions

These questions should be resolved before converting this into strict package rules:

1. What exact Workflower path aliases should be used?
2. What dependency-cruiser rule shape best enforces repo-wide cross-package internals privacy?
3. Where should explicit justifications for non-exported `package-api/` support files live: code comments, architecture notes, or PR descriptions?

## Rollout Plan

1. Finalize Workflower dependency-cruiser constraints for the target shape.
2. Add architecture constraints before moving Workflower files.
3. Refactor Workflower source into the target shape without changing behavior.
4. Evaluate whether tests need structural changes.
5. Extract any lessons back into the general architecture doc.
6. Apply package-specific target shapes to the next suPIerior package.
