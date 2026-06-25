# Decomposed Skill and Rule Directives

## Summary

We want an easier way to coordinate the creation and maintenance of multiple interrelated skills and rules by decomposing shared concepts, methodologies, and configuration into reusable Markdown modules.

The motivating example is the `counter` workflow skills:

- `counter-init`
- `counter-increment`
- `counter-start-loop`
- `counter-continue`

These skills all share the same conceptual model: a garden-scoped counter state object with a current value, an end value, and a loop workflow id. Today those names are repeated directly in each skill, for example `counter`, `current`, `end`, and `counter-loop`. The desired architecture would let those shared concepts and variable names live in one place and be reused by every related skill.

This same pattern should also apply to larger skill families such as implementation/review workflows, where multiple skills share the same methodology but differ in their step-specific responsibilities.

## Desired Direction

Introduce a decomposed Markdown authoring model for skills and rules, with a small directive syntax based on `@` directives.

Possible directives:

```md
@import ./shared-methodology.md
@import ./variables.md
@var stateKey = "counter"
@var currentField = "current"
@var endField = "end"
@var loopWorkflowId = "counter-loop"
@pin ./related-rule.md
```

Variable interpolation should use an explicit syntax to avoid accidental collisions with GitHub handles, package scopes, or ordinary prose:

```md
@{stateKey}
@{currentField}
@{endField}
@{loopWorkflowId}
```

Avoid magical replacement of bare `@name`; prefer explicit directives and explicit interpolation.

## Proposed Semantics

| Directive | Meaning for skills | Meaning for rules |
| --- | --- | --- |
| `@import path` | Textually include a shared skill module or methodology file | Textually include a shared rule module |
| `@var name = value` | Define a reusable value for skill prompts | Define a reusable value for rule text |
| `@{name}` | Replace with the defined variable value | Replace with the defined variable value |
| `@pin path` | Ensure related skill context or companion material is surfaced | Ensure related rules are surfaced/injected with the current rule |

## Counter Example

Possible source layout:

```text
skills/
  counter-init/SKILL.src.md
  counter-increment/SKILL.src.md
  counter-start-loop/SKILL.src.md
  counter-continue/SKILL.src.md
  skill-api/
    counter-core.md
    counter-vars.md
```

`skill-api/counter-vars.md`:

```md
@var stateKey = "counter"
@var currentField = "current"
@var endField = "end"
@var loopWorkflowId = "counter-loop"
```

`skill-api/counter-core.md`:

```md
Counter state lives under `@{stateKey}`.

The state object must contain finite integer fields:

- `@{currentField}`
- `@{endField}`
```

`counter-increment/SKILL.src.md`:

```md
---
name: counter-increment
description: Increments the counter garden state.
allowed-tools: workflower_state_get workflower_state_set
---

@import ../skill-api/counter-vars.md
@import ../skill-api/counter-core.md

# Counter Increment

Read `@{stateKey}`.
Increment `@{currentField}` by one.
Preserve `@{endField}`.
Save the updated state.
```

The compiled or injected form would be normal Markdown with variables resolved:

```md
Read `counter`.
Increment `current` by one.
Preserve `end`.
Save the updated state.
```

## Skill Architecture Use Case

For more complex skill families, shared modules could capture methodology while step-specific skills stay small.

Example:

```text
skills/
  implementor/SKILL.src.md
  reviewer/SKILL.src.md
  pr-reviewer/SKILL.src.md
  skill-api/
    strict-tdd-methodology.md
    review-criteria.md
    artifact-vars.md
```

Each skill could import the same methodology and variable definitions while adding only its unique task instructions.

This keeps related skills aligned and reduces drift between implementation, review, and PR review behavior.

## Rules Pinning Use Case

The same directive approach could support rule files.

Example rule file:

```md
@pin ../testing/strict-tdd.md
@pin ../architecture/domain-boundaries.md

# Package Rule

This package follows the pinned TDD and domain boundary rules.
```

A rules injection system could treat `@pin` as a request to include or strongly surface related rules whenever the current rule is selected. This would provide a quick, explicit pinning mechanism for files, directories, packages, or conversations.

## Compilation vs Runtime Resolution

There are three possible implementation strategies:

1. **Build-time compilation**
   - Authors write `.src.md` files.
   - A compiler emits normal `SKILL.md` or rule `.md` files.
   - Best for publishable skill packages because Pi already expects plain `SKILL.md` files.

2. **Runtime resolution**
   - Pi, Workflower, or pi-rules resolves directives dynamically during skill/rule loading.
   - Best for local rules authoring and dynamic context injection.

3. **Hybrid**
   - Use build-time compilation for skills.
   - Use runtime resolution/pinning for rules.
   - This is likely the best long-term path.

## Initial Recommendation

Start with a lightweight convention and compiler-friendly syntax:

- Use `@import` for shared Markdown modules.
- Use `@var` for reusable names/configuration.
- Use `@{name}` for interpolation.
- Use `@pin` for rule/context pinning.
- Avoid bare `@name` replacement.

Then implement incrementally:

1. Document the syntax and conventions.
2. Refactor a small skill family, such as the counter skills, into `.src.md` plus shared `skill-api` modules.
3. Add a small compiler that expands imports and variables into generated `SKILL.md` files.
4. Extend pi-rules to recognize `@pin` for related rule injection.
5. Consider runtime directive resolution only after the static compiler and rule pinning semantics are proven useful.
