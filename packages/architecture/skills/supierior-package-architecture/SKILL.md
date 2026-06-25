---
name: supierior-package-architecture
description: Use when creating, restructuring, or reviewing suPIerior packages or Pi package source layouts, especially TypeScript Pi extensions with package-api, internals, pi-adapter, public exports, package capabilities, import direction, or package-local dependency boundaries.
allowed-tools: read write edit bash
---

# suPIerior Package Architecture

Use this skill for suPIerior workspace packages and closely related Pi package layout decisions.

## Required references

Before making package structure decisions, read and apply:

```text
supierior-package-architecture.md
ai-navigable-folder-architecture.md
```

## Apply the package shape deliberately

For TypeScript Pi extension packages, prefer this direction when the package is large enough to benefit from the seams:

```text
extension-src/<package-name>/
├── index.ts
├── package-api/
└── internals/
    ├── pi-adapter/
    └── <capability>/
```

Use the pattern to clarify real structure, not to create empty folders.

## suPIerior defaults

- Keep package-root exports as the stable public package surface.
- Keep public contracts near the top in `package-api/`.
- Keep substantial Pi runtime integration in `internals/pi-adapter/`.
- Keep core package behavior in `internals/<capability>/`, named with domain language.
- Use `internals/logic/` only when there is one obvious capability and no better name.
- Keep adapter imports one-way: adapters may import internal capability logic; internal capability logic should not import adapters.
- Keep internal runtime helpers private unless intentionally promoted to the package-root API.
- Prefer explicit type filenames such as `workflow-definition.types.ts`, `active-state.types.ts`, or `converter-contract.types.ts` when a type family is shared or public.
- Do not restructure tests just to mirror source folders; move tests only when it improves navigability or targets a deep interface more clearly.

## Markdown-only skill packages

For small skill packages, a direct `skills/<skill>/SKILL.md` shape is fine.

When a Markdown-only skill package accumulates substantial support material, use an analogous split:

```text
skill-root/
├── SKILL.md
├── skill-api/
└── internals/
```

Use `skill-api/` for stable instruction surface and `internals/` for examples, templates, checklists, or implementation notes that are not the primary instruction surface.

## Before editing

State:

- whether the package is a TypeScript Pi extension, Markdown-only skill package, workflow package, or mixed package;
- the intended public surface;
- the internal capability names;
- the Pi adapter seam, if any;
- import directions to preserve;
- whether dependency-cruiser or package-local lint rules should be updated before moving files.

Project-specific package rules under `.pi/rules` still win. If this skill conflicts with a package's injected rules, follow the package rule and call out the conflict.
