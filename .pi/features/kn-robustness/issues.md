# Issues for Robust Feature Artifact Handoff Generation

---

title: "Generate only feature.md and issues.md"
type: AFK
labels: []
blockedBy: []

---

## What to build

Update the feature workflow artifact generation path so new runs produce only `feature.md` and `issues.md`, with no generated `plan.md` and no forward-looking artifact list entry for `plan.md`.

Covered user stories: 9, 10.

## Acceptance criteria

- [ ] Generated artifact lists contain only `feature.md` and `issues.md`
- [ ] New feature workflow runs do not create `plan.md`
- [ ] Tests assert `plan.md` is not generated
- [ ] Existing `plan.md` files are not deleted or migrated

## Blocked by

None - can start immediately

---

title: "Strengthen feature.md durable spec structure"
type: AFK
labels: []
blockedBy: ["Generate only feature.md and issues.md"]

---

## What to build

Update the `feature.md` generation prompt/template so every generated feature spec includes the required durable handoff sections for intent, scope, risks, validation, implementation notes, and traceability.

Covered user stories: 1, 2, 7, 8.

## Acceptance criteria

- [ ] `feature.md` always includes Summary
- [ ] `feature.md` always includes Problem / Opportunity
- [ ] `feature.md` always includes Goals and Non-goals
- [ ] `feature.md` always includes Users / Stakeholders
- [ ] `feature.md` always includes Scope
- [ ] `feature.md` always includes Assumptions and Open Questions
- [ ] `feature.md` always includes Risks / Edge Cases
- [ ] `feature.md` always includes Implementation Notes
- [ ] `feature.md` always includes Validation / Acceptance Criteria
- [ ] `feature.md` always includes Traceability to Issues
- [ ] Missing information is represented with `Needs discovery`, `Assumption`, or `Unknown`

## Blocked by

Generate only feature.md and issues.md

---

title: "Strengthen issues.md vertical slice structure"
type: AFK
labels: []
blockedBy: ["Generate only feature.md and issues.md"]

---

## What to build

Update the `issues.md` generation prompt/template so each issue is an independently verifiable vertical slice with goal, scope, dependencies, acceptance criteria, validation notes, risks, and feature references.

Covered user stories: 3, 4, 5, 6, 7, 8.

## Acceptance criteria

- [ ] Generated issues avoid umbrella-only, dependency-only, and coordination-only work items
- [ ] Generated issues avoid phase-only buckets unless each bucket has an independently verifiable deliverable
- [ ] Every top-level issue includes a concrete mergeable deliverable
- [ ] Every issue includes acceptance criteria
- [ ] Every issue includes test or validation notes
- [ ] Every issue includes risks where relevant or an explicit gap marker
- [ ] Every issue includes dependencies or sequencing notes
- [ ] Every issue references relevant feature sections or marks traceability gaps explicitly
- [ ] Subissues, if generated, are independently verifiable

## Blocked by

Generate only feature.md and issues.md

---

title: "Add gap marker handling for incomplete discovery"
type: AFK
labels: []
blockedBy: ["Strengthen feature.md durable spec structure", "Strengthen issues.md vertical slice structure"]

---

## What to build

Ensure generated artifacts preserve required structure when discovery is incomplete by explicitly marking missing or ambiguous details with `Needs discovery`, `Assumption`, or `Unknown` instead of omitting sections or inventing unsupported detail.

Covered user stories: 2, 8.

## Acceptance criteria

- [ ] Required `feature.md` sections remain present when source discovery is incomplete
- [ ] Required `issues.md` issue fields remain present when source discovery is incomplete
- [ ] Missing details are marked with `Needs discovery`, `Assumption`, or `Unknown`
- [ ] Generation guidance discourages inventing unsupported technical implementation detail
- [ ] Tests or snapshots cover incomplete discovery output

## Blocked by

Strengthen feature.md durable spec structure; Strengthen issues.md vertical slice structure

---

title: "Fold planning content into feature and issue artifacts"
type: AFK
labels: []
blockedBy: ["Strengthen feature.md durable spec structure", "Strengthen issues.md vertical slice structure"]

---

## What to build

Move useful planning concepts previously represented by `plan.md` into the strengthened `feature.md` and `issues.md` artifact guidance, without generating a separate planning file.

Covered user stories: 1, 3, 9.

## Acceptance criteria

- [ ] Implementation notes and validation expectations are represented in `feature.md`
- [ ] Sequencing, dependencies, risks, and validation notes are represented in `issues.md`
- [ ] Prompt or template references no longer direct planning content into `plan.md`
- [ ] No backward-compatibility or migration behavior for existing `plan.md` is added

## Blocked by

Strengthen feature.md durable spec structure; Strengthen issues.md vertical slice structure

---

title: "Remove plan.md references from prompts examples and docs"
type: AFK
labels: []
blockedBy: ["Generate only feature.md and issues.md"]

---

## What to build

Update forward-looking prompts, documentation, examples, and artifact descriptions so they describe the two-file output model and no longer reference `plan.md` as generated output.

Covered user stories: 9, 10.

## Acceptance criteria

- [ ] Documentation describes generated output as `feature.md` and `issues.md`
- [ ] Examples do not show new workflows generating or requiring `plan.md`
- [ ] Prompt text does not reference `plan.md` as a forward-looking artifact
- [ ] Artifact list documentation excludes `plan.md`
- [ ] Any documentation tests are updated if present

## Blocked by

Generate only feature.md and issues.md

---

title: "Add artifact structure regression tests"
type: AFK
labels: []
blockedBy: ["Add gap marker handling for incomplete discovery", "Fold planning content into feature and issue artifacts"]

---

## What to build

Add or update behavior-focused tests that validate the generated two-file artifact model and the strengthened structures for both `feature.md` and `issues.md`.

Covered user stories: 1, 2, 3, 6, 7, 8, 9, 10.

## Acceptance criteria

- [ ] Tests assert generated artifacts include only `feature.md` and `issues.md`
- [ ] Tests assert `feature.md` includes all required durable-spec sections
- [ ] Tests assert `issues.md` includes acceptance criteria, validation notes, risks, dependencies, and traceability
- [ ] Tests assert missing information uses explicit gap markers
- [ ] Tests assert generated issues are framed as independently verifiable vertical slices
- [ ] Golden-output or snapshot tests are updated if that style already exists

## Blocked by

Add gap marker handling for incomplete discovery; Fold planning content into feature and issue artifacts

---

title: "Document manual validation for the two-file workflow"
type: AFK
labels: []
blockedBy: ["Remove plan.md references from prompts examples and docs", "Add artifact structure regression tests"]

---

## What to build

Add or update workflow documentation with manual validation steps for confirming the new artifact behavior end to end.

Covered user stories: 1, 3, 6, 9, 10.

## Acceptance criteria

- [ ] Documentation instructs maintainers to run the feature workflow and confirm no `plan.md` is created
- [ ] Documentation explains how to verify `feature.md` is usable as a durable handoff spec
- [ ] Documentation explains how to verify `issues.md` contains mergeable, testable vertical slices
- [ ] Documentation includes expectations for explicit gap markers during incomplete discovery

## Blocked by

Remove plan.md references from prompts examples and docs; Add artifact structure regression tests
