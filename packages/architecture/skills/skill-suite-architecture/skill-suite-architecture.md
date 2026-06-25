# Skill Suite Architecture

## Purpose

Use this architecture pattern when a group of related skills forms a suite: multiple executable `SKILL.md` files that depend on the same contracts, schemas, examples, operating rules, templates, or domain principles.

This is different from a single large skill with support files. In a skill suite, the suite itself is the module. The shared suite files define what all member skills must know; each executable skill defines one specific action.

General folder architecture principles live beside this document:

```text
ai-navigable-folder-architecture.md
```

Read and apply that file before applying this suite-specific pattern.

## Core Principle

A skill suite should read from broad shared context to narrow executable behavior.

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

The suite root contains the information that gives meaning to the whole suite. The `skills/` folder contains executable leaves.

## When To Use A Skill Suite

Use a suite when two or more skills share meaningful context, such as:

- a state shape or JSON contract;
- artifact or output file formats;
- workflow, handoff, or sequencing rules;
- shared examples or templates;
- quality standards or review criteria;
- domain language that must remain consistent across steps;
- tool-use rules that multiple skills must follow.

Do not create a suite for a simple standalone skill. A single `SKILL.md` with one or two directly referenced support files is fine when there is no family of related executable skills.

## Recommended Shape

```text
counter/
├── counter-state.md
├── counter-loop-contract.md
└── skills/
    ├── init/
    │   └── SKILL.md
    ├── start-loop/
    │   └── SKILL.md
    ├── increment/
    │   └── SKILL.md
    └── continue/
        └── SKILL.md
```

In this shape:

- `counter/` is the suite module.
- `counter-state.md` owns the shared state key, field meanings, validation rules, and examples.
- `counter-loop-contract.md` owns shared loop, handoff, and completion behavior.
- `skills/init/SKILL.md` owns only initialization-specific behavior.
- `skills/increment/SKILL.md` owns only increment-specific behavior.

## Why Use A `skills/` Folder

Keep executable skill leaves under `skills/` by default.

This creates a clean distinction between:

1. suite-level context files that should be read first; and
2. executable skill entrypoints that apply that context to one action.

Avoid mixing shared files and executable skill folders at the suite root unless the suite is tiny and the shape is clearly more readable. As a suite grows, a mixed root makes it harder to tell which files define shared contracts and which folders are invocable skills.

## Skill Folder Names

Inside a suite, action folder names should be local and readable.

Prefer:

```text
counter/skills/init/SKILL.md
counter/skills/increment/SKILL.md
```

Avoid unnecessary repetition:

```text
counter/skills/counter-init/SKILL.md
counter/skills/counter-increment/SKILL.md
```

The `name:` field in `SKILL.md` can still use globally unique names, such as `counter-init` or `counter-increment`. The folder path already supplies the suite context, so the action folder should add only the new information.

For public cross-harness skills, consider the Agent Skills convention that directory names match skill names. For Pi-focused package or project skills, prefer AI-navigable local folder names when they make the suite easier to read.

## Shared Suite Files

Shared files should own stable suite concepts. They are not dumping grounds.

Prefer specific names:

```text
counter-state.md
issue-format.md
planning-principles.md
github-publishing-contract.md
workflow-handoff-contract.md
```

Avoid vague names:

```text
common.md
shared.md
notes.md
misc.md
reference.md
```

A shared file should usually contain one coherent concept, such as:

- a data contract;
- an artifact format;
- a quality bar;
- a workflow protocol;
- a template family;
- a shared checklist;
- a tool-use contract.

If a shared file starts covering unrelated concepts, split it into named concept files.

## Executable Skill Files

Each `SKILL.md` should stay focused on one executable behavior.

A member skill should include:

- required frontmatter;
- a short role statement;
- the specific goal of this action;
- explicit instructions to read the shared suite files it depends on;
- action-specific steps;
- action-specific tool constraints or output expectations.

A member skill should not duplicate suite-wide contracts. Instead, it should point to the owning shared file.

Prefer:

```markdown
## Shared Context

Before acting, read and apply:

- `../../counter-state.md`
- `../../counter-loop-contract.md`
```

Avoid copying the same state schema, validation rules, output format, or workflow protocol into every sibling skill.

## Relative References

References in a `SKILL.md` are resolved relative to that skill's directory. In the recommended shape, member skills usually reference suite-root files with `../../` paths.

Example from `counter/skills/increment/SKILL.md`:

````markdown
Before acting, read and apply:

```text
../../counter-state.md
../../counter-loop-contract.md
```
````

```

Keep these references explicit. Do not assume the agent will infer which suite files matter.

## Dependency Locality

Put information at the lowest level that owns it.

- If all skills in the suite need it, put it at the suite root.
- If only one skill needs it, keep it beside that skill.
- If only a subset of skills need it and the subset is stable, consider a nested suite or a clearly named subfolder.

Do not promote one skill's private implementation notes to the suite root just because they are long. Promote only shared contracts or concepts.

## Avoid Redundancy

Skill suites should make repeated information disappear.

Good candidates for extraction to suite-root files include:

- repeated state schemas;
- repeated artifact shapes;
- repeated validation rules;
- repeated tool-use warnings;
- repeated examples;
- repeated quality criteria;
- repeated workflow or handoff rules.

Do not extract text that is merely coincidentally similar. Shared files should represent real suite concepts, not mechanical deduplication.

## Front-Door Reading Order

A maintainer or agent should be able to understand the suite by reading in this order:

1. suite folder name;
2. suite-root shared files;
3. `skills/` action folder names;
4. the relevant action's `SKILL.md`;
5. any action-local support files.

The folder path should tell the story before the file is opened.

## Importing The Pattern Into A Suite

Before converting loose skills into a suite, answer:

1. What concept names the suite?
2. Which executable skills belong to that concept?
3. What information is duplicated across those skills?
4. Which duplicated information is a real shared contract?
5. What suite-root files should own those contracts?
6. Which details are action-specific and should remain inside one skill?
7. What clean local action names should be used under `skills/`?
8. Which shared files must each `SKILL.md` explicitly read?

## Naming Rules

1. Name the suite after the shared concept, not after a technical container.
2. Name action folders after local actions, not globally prefixed skill names.
3. Name shared files after the concept they own.
4. Avoid `common`, `shared`, `notes`, `misc`, and other vague file names.
5. Keep `SKILL.md` as the executable entrypoint for each member skill.
6. Keep suite-root files stable and reusable across member skills.
7. Keep action-local files below the action folder.
8. Do not decompose simple standalone skills just to follow this pattern.
```
