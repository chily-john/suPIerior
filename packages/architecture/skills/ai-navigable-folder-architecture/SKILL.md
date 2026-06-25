---
name: ai-navigable-folder-architecture
description: Use when choosing file and folder placement, source tree organization, public versus internal layout, module seams, adapter folders, direct versus shared dependencies, front-door files, or import direction so a human or AI can navigate by path.
allowed-tools: read write edit bash
---

# AI-Navigable Folder Architecture

Use this skill to make source trees readable from their paths and to avoid shallow structural churn.

## Required reference

Before making structural decisions, read and apply:

```text
ai-navigable-folder-architecture.md
```

## Process

1. Identify the current or intended **public surface**:
   - root entrypoint;
   - exported package API;
   - files external callers are expected to import or understand.
2. Identify the **internal implementation**:
   - major capabilities;
   - runtime phases;
   - private helpers;
   - state, artifacts, validation, rendering, or prompting areas.
3. Identify meaningful **adapter seams**:
   - external runtimes;
   - commands/events/lifecycle;
   - transport, credentials, protocols, filesystem, database, UI, or Pi integration.
4. Classify dependencies:
   - direct dependencies stay near or below the importer;
   - shared dependencies move to the nearest common ancestor;
   - sibling modules should not import each other's private helpers.
5. Choose front-door files for module-like folders.
6. Avoid shallow splits:
   - no pass-through files unless they define a useful interface or seam;
   - no `utils`, `helpers`, `common`, or vague dumping grounds when domain names exist.

## Before editing

For any non-trivial structure change, briefly state:

- the proposed folder story from broad context to narrow detail;
- what stays public;
- what becomes internal;
- which imports should be allowed or suspicious;
- why the split creates locality or leverage.

Then apply the smallest change that improves navigability.
