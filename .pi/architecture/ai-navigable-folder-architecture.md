# AI-Navigable Folder Architecture

## Purpose

Use this architecture pattern when source code needs to be easy for an AI or human maintainer to navigate by reading folder paths alone.

This pattern is intentionally project-agnostic. It defines principles for arranging public surfaces, internal implementation, adapters, direct dependencies, shared dependencies, and deep modules.

## Core Principle

Folder paths should tell a story.

Each path segment should add new information. Do not repeat context already established by a parent folder.

Prefer:

```text
<capability>/use-cases/start/start-thing.ts
```

Avoid:

```text
<capability>/<capability>-use-cases/start-thing/start-thing.ts
```

Once a maintainer is inside a folder named after a capability, child folders should not repeat that capability name unless the repetition disambiguates two real concepts.

## Visibility Gradient

Arrange source code by descending visibility.

A common shape is:

```text
source-root/
├── index.ts
├── package-api/
└── internals/
```

The exact folder names can vary, but the principle is required: externally facing code should be easier to find than internal implementation code.

### Entrypoint

The root entrypoint exposes the smallest stable public surface and delegates implementation details elsewhere.

Examples:

```text
index.ts
main.ts
extension.ts
```

### Package API / Public Surface

Public-facing modules are modules external callers are expected to import, read, or understand.

Recommended default:

```text
package-api/
```

Other acceptable names when they better match the project:

```text
public-api/
external-api/
exports/
```

Prefer explicit files:

```text
package-api/register-thing.ts
package-api/thing-definition.types.ts
```

Keep `package-api/` small. If a public-facing implementation becomes large, keep the public interface near the top and move implementation details down into internals.

### Internal Implementation

Internal modules should live below an explicit internal implementation folder.

Recommended default:

```text
internals/
```

Other names are acceptable only when they are more intuitive for the project. In most codebases, `internals/` is the clearest default because it removes ambiguity and prevents agents from inventing synonyms.

This folder is not a miscellaneous dumping ground. Every direct child must name a major seam, capability, adapter, or responsibility.

## Imported Code Is an Interaction Point

Every import creates an interaction point. Folder structure should make those interaction points easy to see.

There are two useful categories:

### Direct Dependency

A direct dependency is imported by one primary module or one narrow local area.

Place it near the importer:

```text
use-cases/start/
├── start-thing.ts
├── parse-start-args.ts
└── start.types.ts
```

A direct dependency may be a sibling of the importer or beneath the importer’s local area.

This is encouraged when the dependency is only meaningful in that local flow. It improves locality because an AI can understand the use case by descending within one folder.

Avoid pushing direct dependencies up to shared folders prematurely. That makes local details look more important and more reusable than they are.

### Shared Dependency

A shared dependency is imported by multiple sibling areas or represents a stable seam.

Place it at the nearest common ancestor of all importers, usually in a sibling folder.

```text
runtime/
├── use-cases/
│   ├── start/
│   └── advance/
├── state/
└── artifacts/
```

Here, `state/` and `artifacts/` are visible siblings of `use-cases/` because multiple use cases may interact with them.

Do not bury shared dependencies under one importer. That makes other importers look like they are reaching into someone else’s private implementation.

The nearest common ancestor rule means: place shared code as low as possible while still being a sibling or visible child of every area that imports it. This avoids both extremes:

- too high: shared code becomes global clutter;
- too low: other modules must reach into another module’s private details.

## Adapter and Logic Separation

External runtime/framework integrations should live in explicit adapter folders when they are substantial enough to be a seam.

Examples:

```text
internals/http-adapter/
internals/cli-adapter/
internals/database-adapter/
internals/editor-adapter/
```

Not every external interaction needs an adapter folder. If there is no meaningful adapter seam, keep the code local and explicit. Create an adapter folder when the external system has commands, events, lifecycle, protocols, credentials, transport, or other details that should not leak into core logic.

Adapters may import internal logic. Internal logic must not import adapters.

Allowed:

```text
internals/<external>-adapter/*
  -> internals/<capability>/*
```

Avoid:

```text
internals/<capability>/*
  -> internals/<external>-adapter/*
```

This preserves testability and keeps the core implementation independent from the external runtime.

## Capability Logic

Internal logic should be grouped by domain capability, not by generic technical layer names.

Good capability-oriented examples:

```text
internals/order-fulfillment/
internals/context-discovery/
internals/issue-publishing/
internals/rule-injection/
```

If there is only one obvious capability and a capability name would be redundant or awkward, `internals/logic/` is acceptable. Prefer capability names when the codebase has or may develop multiple capabilities.

Avoid vague catch-all names:

```text
utils/
helpers/
common/
management/
```

These names hide why the code exists.

## Descending Internal Flow

Inside an internal capability folder, organize by conceptual flow. The exact names are domain-dependent.

A possible shape is:

```text
internals/<capability>/
├── definitions/
├── runtime/
└── output/
```

But this is only an example. Use names that match the package or product language.

The goal is for each deeper folder to answer a more specific question:

```text
What capability is this?
  -> What phase or seam within that capability?
    -> What action or data family?
      -> What exact module?
```

## Folder-Level Interfaces

When a folder represents a module, it should have an obvious front-door file.
Callers outside the folder should import the front-door file instead of reaching into helper files.
Helper files are implementation details unless deliberately promoted.

Example:

```text
use-cases/start/
├── start-thing.ts
├── parse-start-args.ts
├── prepare-start-state.ts
└── start.types.ts
```

Here, `start-thing.ts` is the front-door interface for the start use case. The parser and preparation files are implementation details unless the folder intentionally exposes them.

If multiple outside callers need a helper, either:

1. move it to the nearest shared sibling location; or
2. expose a deliberate deeper module interface from the owning folder.

Sibling use cases should not import each other's private helper files. If that starts to happen, the helper probably belongs in a shared sibling module or behind a clearer folder-level interface.

## Avoid Shallow Splits

Explicit files improve navigability only when the split creates locality, hides implementation detail, isolates an adapter interaction point, or reduces cognitive load.

Do not split files merely to make names smaller. Avoid one-file modules that simply pass through to another file unless they define a meaningful interface, adapter interaction point, or stable seam.

Use the deletion test: if deleting the file would not concentrate complexity and would only remove indirection, it is probably shallow.

## Type File Naming

Files should be explicit about what they contain.

Dedicated type files should use `.types.ts` and name the type family they own.

Prefer:

```text
thing-definition.types.ts
active-state.types.ts
start-command.types.ts
```

Avoid:

```text
types.ts
thing.ts
state.ts
```

This does not mean every type must live in a separate file. Local types can remain near the implementation that owns them. Use dedicated `.types.ts` files when the type family is imported elsewhere, public-facing, or large enough to deserve its own module.

## File and Folder Naming Rules

1. Paths should read from broad context to narrow detail.
2. Each path segment should add information.
3. Avoid repeating parent context in child folders.
4. Keep public-facing modules shallow.
5. Put direct dependencies near or below their importer.
6. Put shared dependencies at the nearest common ancestor of their importers.
7. Give module-like folders an obvious front-door file.
8. Do not let sibling modules import each other's private helpers.
9. Use explicit adapter names when external runtimes form a real seam.
10. Use explicit files rather than generic files.
11. Avoid shallow splits and pass-through files.
12. Avoid `utils`, `helpers`, `common`, and `management` unless no clearer concept exists.
13. Prefer domain language over generic software architecture labels.

## Import Direction

A typical dependency direction is:

```text
entrypoint
  -> package API
  -> adapters

package API
  -> internal implementation through narrow seams

adapters
  -> internal capability logic

internal use cases
  -> direct local dependencies
  -> shared sibling dependencies
```

Forbidden or suspicious directions:

```text
internal logic -> external adapter
internal logic -> root entrypoint
shared dependency -> use case that consumes it
sibling capability -> another sibling's private subfolder
external package -> another package's internals
```

If a module needs to import from another module’s private subfolder, either:

1. move the imported module to a shared sibling location, or
2. expose a deeper module interface from the owning folder.

Do not treat every file in a folder as equally importable. Prefer importing the folder's front-door file from outside the folder, and keep helper files private to the folder unless they have been intentionally promoted.

## Deep Module Design

Folder structure should support deep modules.

A deep module has a small, stable interface and substantial behavior hidden behind it. Folder structure should make the interface easy to find and the implementation easy to descend into.

Prefer:

```text
use-cases/start/start-thing.ts
```

as the obvious interface for the start use case, with implementation details nearby:

```text
use-cases/start/
├── start-thing.ts
├── parse-start-args.ts
├── prepare-start-state.ts
└── start.types.ts
```

Avoid scattering one use case across many unrelated top-level folders just to keep technical categories pure.

## Sample General Shape

```text
source-root/
├── index.ts
├── package-api/
│   ├── exported-action.ts
│   └── exported-contract.types.ts
└── internals/
    ├── <external-runtime>-adapter/
    │   ├── register-adapter.ts
    │   ├── commands/
    │   └── events/
    └── <capability>/
        ├── definitions/
        │   ├── registry/
        │   └── validation/
        ├── runtime/
        │   ├── use-cases/
        │   │   ├── start/
        │   │   └── advance/
        │   ├── state/
        │   └── artifacts/
        └── output/
            └── render-output.ts
```

This sample is illustrative, not mandatory. Adapt the names to the domain.

## Questions To Resolve Per Project

Before applying this pattern to a project, answer:

1. What code is external-facing and should remain near the top?
2. What code is internal implementation?
3. What external systems deserve explicit adapter folders?
4. What are the main domain capability names?
5. Which dependencies are direct and should stay local or below their importer?
6. Which dependencies are shared and should move to a common sibling location?
7. What import directions should be enforced?
8. Which type families deserve `.types.ts` files?
9. What folder names would be meaningful to someone who knows the domain but not the code?
10. Which folders would become dumping grounds and need better names?
