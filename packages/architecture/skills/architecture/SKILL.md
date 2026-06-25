---
name: architecture
description: Use before creating or reorganizing folders, creating multiple related files that affect module structure, adding package source layout, designing skill suites, or changing public surfaces, import direction, adapter seams, module boundaries, or file placement.
allowed-tools: read write edit bash
---

# Architecture

Use this as the routing skill for structural work. It should not replace project rules or local conventions; it decides which architecture guidance to read before making file and folder decisions.

## When this matters

Load and apply this skill when the change affects any of these:

- folder layout or source tree organization;
- creating multiple related files as a module, package area, workflow, or skill suite;
- public package surface, exported contracts, or root entrypoints;
- internal implementation placement;
- adapter seams for external runtimes, commands, events, lifecycle, transport, credentials, or protocols;
- import direction or folder-level privacy;
- moving helpers between local, sibling, shared, or public locations.

For a simple localized bug fix where file placement is already obvious, keep this lightweight and do not add ceremony.

## Routing

Read only the relevant target skill(s):

1. **suPIerior package or Pi package structure**
   - If editing a suPIerior workspace package, creating a new package, restructuring TypeScript Pi extension source, or deciding package public/internal layout, read and apply:
     - `../supierior-package-architecture/SKILL.md`

2. **Skill suite**
   - If designing or reorganizing a collection of related skills that share contracts, schemas, examples, templates, operating rules, quality bars, or workflow handoff behavior, read and apply:
     - `../skill-suite-architecture/SKILL.md`

3. **General folder architecture**
   - If neither specialized route applies, or if you need baseline file/folder placement principles, read and apply:
     - `../ai-navigable-folder-architecture/SKILL.md`

Multiple routes can apply. For example, a suPIerior package that ships a skill suite should use both the package architecture skill and the skill suite architecture skill.

## Before writing files

Briefly state the intended structure in terms of:

- public surface or entrypoint;
- internal capability folders;
- adapter seams, if any;
- direct dependencies that should stay local;
- shared dependencies that should move to the nearest common ancestor;
- front-door files for module-like folders;
- suspicious import directions to avoid.

Then make the smallest structural change that preserves navigability. Do not create empty architecture folders or shallow pass-through files merely to satisfy a pattern.

## Conflict handling

Project-specific `.pi/rules`, existing package conventions, and explicit user direction win over this generic package. If they conflict with these skills, follow the local rule and mention the conflict.
