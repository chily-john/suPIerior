---
name: skill-suite-architecture
description: Use when designing, creating, or reorganizing a collection of related Pi/agent skills that share contracts, schemas, examples, templates, operating rules, domain language, quality criteria, or workflow handoff behavior.
allowed-tools: read write edit bash
---

# Skill Suite Architecture

Use this skill when a group of related skills should behave as a coherent suite rather than as unrelated standalone skills.

## Required references

Before making structural decisions, read and apply:

```text
skill-suite-architecture.md
ai-navigable-folder-architecture.md
```

## Decide whether this is actually a suite

Use a skill suite when two or more executable skills share meaningful context, such as:

- state shape or JSON contracts;
- output artifacts or file formats;
- workflow, handoff, or sequencing rules;
- shared examples or templates;
- quality standards or review criteria;
- domain language that must remain consistent;
- tool-use rules that multiple skills must follow.

Do not create a suite for a simple standalone skill. A single `SKILL.md` with directly referenced support files is better when there is no real family of executable skills.

## Structural default

Prefer:

```text
<suite-name>/
├── <shared-contract>.md
├── <shared-principles>.md
└── skills/
    ├── <action>/
    │   └── SKILL.md
    └── <another-action>/
        └── SKILL.md
```

Inside a package that exposes skills directly through `pi.skills`, adapt the shape without losing the idea: shared suite files live at the suite root, executable skill leaves live under action folders, and each `SKILL.md` explicitly reads the shared files it needs.

## Rules while authoring

- Put suite-wide contracts at the suite root, not duplicated inside every skill.
- Keep action-specific notes beside the action skill.
- Name action folders locally, such as `init` or `review`, not redundantly like `counter-init` when the suite folder already says `counter`.
- Use globally unique `name:` values in `SKILL.md` when the skills will be installed together.
- Avoid vague shared files like `common.md`, `shared.md`, `notes.md`, or `misc.md`.
- Make each member skill's `Shared Context` section list the exact relative files to read.
- If people may copy individual skills out of the suite, include the needed support files in that copied folder or document the dependency clearly.

## Before editing

State:

- what concept names the suite;
- which executable skills belong to it;
- which shared files own the repeated contracts;
- which details remain action-local;
- which relative references each `SKILL.md` must use.
