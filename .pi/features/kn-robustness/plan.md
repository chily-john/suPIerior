# Plan: kn-robustness

## Implementation approach

Build the feature in small, validated increments. Prefer targeted inspection of affected areas over broad codebase research, and record uncertainty where details still need confirmation.

## Task breakdown

- Confirm package or feature ownership.
- Implement the smallest cohesive domain model and runtime integration.
- Add templates, prompts, or UI affordances needed by the user-visible workflow.
- Add unit tests for pure domain behavior.
- Add integration coverage for command orchestration or adapter boundaries where practical.
- Run package and root validation.

## Acceptance criteria

- Can you describe what “increase the robustness” of the generated `feature.md` and `issues.md` means in practice?

For example, are you looking for:

- stronger required sections or schemas,
- better handling of incomplete/ambiguous discovery answers,
- richer acceptance criteria and validation guidance,
- more implementation-ready issue breakdowns,
- better risk/edge-case coverage,
- clearer traceability between feature intent and generated issues,
- or something else?

Also, should removing `plan.md` mean:

1. stop writing the file entirely,
2. remove all references to it from docs/prompts/tests,
3. migrate any useful `plan.md` content into `feature.md` or `issues.md`,
4. or all of the above?:

- Your previous answer came through empty, so I want to restate the key decision in a more concrete way.

For `feature.md` and `issues.md`, what should “more robust” mean for this workflow?

A good default might be:

- `feature.md` becomes the durable product/implementation spec, with clearer sections for intent, scope, non-goals, assumptions, risks, validation, and generated-output traceability.
- `issues.md` becomes more implementation-ready, with better issue titles, dependencies, acceptance criteria, test/validation notes, and risk callouts.
- `plan.md` is no longer generated at all, and any useful planning content is folded into `feature.md` and/or `issues.md`.

Does that default match what you want, or would you prefer a different direction?: Yes exactly

- Great — I’ll treat that default direction as the target.

To make the generated artifacts genuinely more robust, how prescriptive should the new templates/prompts be?

For example, should the generator:

- **Require every section** even when information is unknown, using explicit placeholders like `Unknown`, `Assumption`, or `Needs discovery`,
- **Omit empty sections** to keep files cleaner,
- **Infer reasonable defaults** from the discovery conversation,
- or **flag gaps prominently** so the user knows what still needs clarification?

My recommendation is to keep required sections stable and explicitly mark gaps rather than silently omitting them, because that makes `feature.md` and `issues.md` more dependable for implementation. Does that sound right?: Sure that works

- Let’s pin down the expected behavior around the removed `plan.md`.

When this change is implemented, should the workflow:

- stop creating `plan.md` for all new feature generations,
- remove `plan.md` from any prompts, docs, examples, tests, and generated artifact lists,
- preserve backward compatibility for older feature folders that already contain `plan.md`, without deleting or migrating them,
- and move any useful planning details into `feature.md` / `issues.md` instead?

My recommendation is: **do not delete existing `plan.md` files**, but stop generating and referencing them going forward. Does that match your intent?: Stop generating and referencing going forward. There are none existing right now

- What level of validation should accompany this change?

For example, should implementation include:

- updated or new unit tests that assert only `feature.md` and `issues.md` are generated,
- snapshot/golden-output tests for the stronger artifact structure,
- checks that generated files include required sections and explicit gap markers,
- documentation updates showing the new two-file output,
- or just code/prompt changes without expanding tests?

My recommendation is to update tests and docs alongside the generator behavior, because removing `plan.md` is easy to regress if artifact lists or prompt expectations remain stale. Does that match what you want?: Update tests and docs for sure

- What specific required sections do you want in the strengthened generated files?

A reasonable default would be:

**`feature.md`**

- Summary
- Problem / Opportunity
- Goals
- Non-goals
- Users / Stakeholders
- Scope
- Assumptions and Open Questions
- Risks / Edge Cases
- Implementation Notes
- Validation / Acceptance Criteria
- Traceability to Issues

**`issues.md`**

- Issue list overview
- Per-issue title, goal, scope, dependencies, acceptance criteria, test/validation notes, risks, and references back to feature sections
- Explicit `Needs discovery` / `Assumption` markers where details are missing

Does this structure match what you want, or are there sections you’d add, remove, or rename?: Sure...

- One final detail: how should `issues.md` decide the _granularity_ of generated issues?

A sensible default would be:

- create implementation-sized issues rather than tiny task lists,
- include dependencies/order when sequencing matters,
- keep each issue independently understandable,
- include acceptance criteria and validation notes per issue,
- and avoid inventing overly specific technical work when discovery did not provide enough context — mark it as `Needs discovery` or `Assumption` instead.

Does that match your preference, or do you want `issues.md` to be more detailed and task-like?: It needs to follow vertical slicing. Each issue should contain completely testable and verifiable code. So, each issue should build something that can be merged back into master and work perfectly. We can create subissues, but I don't like parent issues not having an absolute verifiable deliverable

- That vertical-slice requirement is important, and I agree with it.

For `issues.md`, should the generator enforce this as a hard quality rule? For example:

- every top-level issue must produce a mergeable, working, independently testable increment,
- every issue must include concrete verification steps,
- dependency-only / umbrella / coordination issues should be avoided unless they also have their own verifiable deliverable,
- subissues are allowed only when each subissue is also independently verifiable,
- and if the feature cannot be sliced cleanly from the available discovery context, the generator should call that out with `Needs discovery` rather than inventing fake slices.

My recommendation is to make this explicit in the artifact-generation prompt/template and test coverage, because otherwise issue generation tends to drift back into phase-based buckets like “backend,” “frontend,” and “tests.” Does that match your intent?: Yes, that's exactly right

## Validation plan

- Run targeted unit tests for changed modules.
- Run package build, typecheck, lint, and test scripts.
- Manually exercise the primary user workflow when UI behavior changes.

## Risks / Watchouts

- None identified for V1.

## Verified affected areas

- To be verified during implementation.

## Likely / To-verify affected areas

- Feature slug: kn-robustness
- Model readiness note: I have enough to generate the feature spec: strengthen `feature.md` and `issues.md`, stop generating/referencing `plan.md`, update docs/tests, and enforce vertical-slice issues with independently verifiable deliverables.
