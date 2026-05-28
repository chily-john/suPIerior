## Problem Statement

The feature discovery workflow currently generates `feature.md`, `issues.md`, and `plan.md`. The generated `feature.md` and `issues.md` are not robust enough to serve as durable implementation handoff artifacts. They need clearer required structure, better handling of incomplete discovery, stronger validation guidance, risk/edge-case coverage, and traceability between feature intent and implementation work.

The generated `issues.md` also needs to avoid phase-based or umbrella breakdowns. Each issue should represent a vertical slice that can be implemented, tested, verified, and merged independently. Parent issues without their own concrete, verifiable deliverable are not acceptable.

The workflow should no longer generate or reference `plan.md`. Any useful planning content should be folded into `feature.md` and/or `issues.md`.

## Solution

Update the feature artifact generation workflow so it produces only two generated files:

- `feature.md`
- `issues.md`

Strengthen `feature.md` so it becomes the durable product and implementation specification. It should include stable required sections for intent, scope, non-goals, assumptions, risks, validation, and traceability to generated issues.

Strengthen `issues.md` so it becomes implementation-ready. Each issue should include a clear title, goal, scope, dependencies or sequencing notes, acceptance criteria, test/validation notes, risks, and references back to the relevant feature sections.

The generator should keep required sections stable even when discovery is incomplete. Missing or ambiguous information should be explicitly marked with gap markers such as `Unknown`, `Assumption`, or `Needs discovery` rather than silently omitted or over-inferred.

The workflow should stop generating `plan.md` and remove references to `plan.md` from prompts, docs, examples, tests, and artifact lists going forward.

## User Stories

1. As a workflow user, I want generated `feature.md` files to include a stable, complete specification structure, so that another coding agent can implement the feature without relying on missing context.

2. As a workflow user, I want generated `feature.md` files to call out assumptions, unknowns, risks, edge cases, and validation expectations, so that implementation gaps are visible instead of hidden.

3. As a workflow user, I want generated `issues.md` files to describe vertical-slice implementation work, so that each issue can be built, tested, verified, and merged independently.

4. As a workflow user, I want every top-level issue to have its own concrete deliverable, so that there are no umbrella or coordination-only issues without verifiable implementation value.

5. As a workflow user, I want subissues to be allowed only when they are independently verifiable, so that issue breakdowns remain actionable and mergeable.

6. As a workflow user, I want each issue to include acceptance criteria and validation notes, so that implementation success can be externally verified.

7. As a workflow user, I want generated issues to reference relevant feature intent and scope, so that implementation work remains traceable to the original discovery.

8. As a workflow user, I want incomplete or ambiguous discovery details to be marked as `Needs discovery`, `Assumption`, or `Unknown`, so that the generator does not invent brittle implementation detail.

9. As a workflow user, I want the workflow to stop creating `plan.md`, so that generated output is simpler and planning information is consolidated into `feature.md` and `issues.md`.

10. As a maintainer, I want tests and docs updated for the two-file artifact model, so that the workflow does not regress back to generating or referencing `plan.md`.

## Implementation Decisions

- Modify the feature artifact generation flow to generate only:
  - `feature.md`
  - `issues.md`

- Remove `plan.md` from all forward-looking generated artifact lists, prompts, documentation, examples, and tests.

- Do not implement migration or deletion behavior for existing `plan.md` files. The expected behavior is only to stop generating and referencing `plan.md` going forward.

- Fold useful planning concepts previously represented by `plan.md` into the strengthened `feature.md` and `issues.md`.

- Update the `feature.md` generation prompt/template so it always includes these required sections:
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

- Update the `issues.md` generation prompt/template so it includes:
  - Issue list overview
  - Per-issue title
  - Goal
  - Scope
  - Dependencies or sequencing notes
  - Acceptance criteria
  - Test/validation notes
  - Risks
  - References back to relevant feature sections
  - Explicit gap markers where discovery is incomplete

- Treat required sections as stable. Do not omit sections simply because discovery did not provide enough detail.

- Use explicit gap markers for incomplete information:
  - `Needs discovery`
  - `Assumption`
  - `Unknown`

- Avoid silently inventing overly specific implementation details when discovery context is insufficient.

- Enforce vertical slicing as a hard quality rule for `issues.md`:
  - Every top-level issue must produce a working, mergeable, independently testable increment.
  - Every top-level issue must have a concrete, verifiable deliverable.
  - Dependency-only, umbrella, or coordination-only issues should be avoided unless they also include their own verifiable deliverable.
  - Subissues are allowed only when each subissue is independently verifiable.
  - If the feature cannot be sliced cleanly from discovery context, the generated artifact should call that out with `Needs discovery` instead of creating fake slices.

- Avoid issue breakdowns that are merely phase-based, such as separate generic buckets for backend, frontend, and tests, unless each bucket independently delivers working user-visible or externally verifiable value.

- Update documentation to describe the new two-file output model and the strengthened expectations for both generated artifacts.

## Testing Decisions

- Update tests to assert that new feature generation produces only `feature.md` and `issues.md`.

- Add or update tests to ensure `plan.md` is not generated or referenced in expected artifact output.

- Add or update golden-output or snapshot-style tests for the stronger artifact structure, if that style already exists in the workflow tests.

- Validate external generated behavior rather than internal implementation mechanics:
  - The generated artifact list should contain only `feature.md` and `issues.md`.
  - `feature.md` should include the required durable-spec sections.
  - `issues.md` should include per-issue acceptance criteria, validation notes, risks, dependencies, and traceability.
  - Generated artifacts should use explicit gap markers when information is missing.
  - Generated issues should be framed as independently verifiable vertical slices, not umbrella-only or phase-only work.

- Update documentation-related tests if the repository has coverage for generated docs, examples, or prompt text.

- Manual validation should include running the feature workflow and confirming:
  - No `plan.md` is created.
  - `feature.md` is usable as a durable handoff spec.
  - `issues.md` contains mergeable, testable vertical slices with concrete verification steps.

## Out of Scope

- Deleting or migrating any existing `plan.md` files.

- Creating a backward-compatibility system for older feature folders that may contain `plan.md`.

- Adding new discovery interview behavior beyond using explicit gap markers for incomplete information.

- Inventing technical implementation details not supported by discovery context.

- Creating parent or umbrella issues that do not have their own independently verifiable deliverable.

## Further Notes

Feature slug: `kn-robustness`.

The primary intent is to make generated handoff artifacts more dependable for another coding agent. `feature.md` should become the durable specification. `issues.md` should become the implementation-ready vertical-slice breakdown. `plan.md` should disappear from generated output and forward-looking references.
