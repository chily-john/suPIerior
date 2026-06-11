# Ruleplementor Core

Shared implementation and review guidance for Ruleplementor skills. This file is intentionally not a registered Pi skill. Registered skills should read and apply it, then layer their own intake, GitHub, branch, PR, or reporting workflow on top.

## Mission

Implement or evaluate requested changes with strict behavioral-red TDD, project-aware context discovery, focused scope control, honest validation, and clear reporting.

## Project Context and Pi Rules

1. Treat injected project rules as authoritative.
2. If relevant `.pi/rules` context was injected, use it and do not inspect the rules tree broadly.
3. If no relevant rules were injected, or likely touched paths become clear only after reconnaissance:
   - identify likely files or directories to touch
   - if `.pi/rules/` exists, read only the matching `.pi/rules/**/*.md` files needed for those paths
   - read parent rules when needed to avoid missing cross-cutting constraints
4. If no `.pi/rules/` system exists, continue using normal project context files such as `AGENTS.md`, README files, package manifests, and nearby tests.
5. Prefer existing project patterns over new abstractions.

## Strict Behavioral-Red TDD

These rules are mandatory for implementation workflows unless the wrapping skill explicitly says it is review-only.

- Do not edit production or implementation code before valid behavioral red.
- A valid red state must be a compiling/runnable behavioral test failure that demonstrates the requested behavior is missing, incorrect, or regressed.
- TypeScript errors, missing imports, missing exports, syntax errors, test framework setup failures, environment failures, and unrelated failures do not count as valid red.
- You may create or modify test files, fixtures, mocks, snapshots, helpers, and test configuration before red when needed to produce a meaningful behavioral test.
- Do not add production APIs, exports, classes, or functions before valid red just to make a test compile.
- If valid behavioral red is not possible, stop and ask the user. Do not proceed to production edits.
- Keep scope tied to the requested change. Do not perform unrelated cleanup.

## Implementation Workflow

### 1. Intake

- Restate the requested behavior or change in concrete terms.
- Identify acceptance criteria, explicit constraints, likely touched areas, and likely validation commands.
- Stop and ask when product behavior is impossible to infer.

### 2. Context Preflight

- Load only the project rules and nearby source/test context needed for the likely touched paths.
- Inspect nearby tests and package scripts to learn test conventions.
- Do not edit production files until the context check is complete.

### 3. Brief Plan

Before creating the red test, state a concise plan with:

- requested behavior summary
- likely package/files
- relevant project rules loaded or considered
- test file/behavior to cover
- expected behavioral red
- focused test command
- final validation commands likely to run

Do not wait for approval unless blocked.

### 4. Red

1. Create or modify the smallest meaningful behavioral test for the requested change.
2. Create test fixtures, mocks, helpers, or test configuration as needed, following existing project conventions.
3. Run the focused test command.
4. Confirm valid behavioral red:
   - the test file compiles/parses
   - the focused test command runs
   - the relevant test fails at an assertion, expectation, snapshot mismatch, or equivalent behavioral check
   - the failure demonstrates the requested behavior is missing, incorrect, or regressed

If the new test cannot reach behavioral red because of test setup, fix test setup without editing production behavior. If that is not possible, stop and ask.

### 5. Green

1. Make the minimal production change needed to pass the red test.
2. Run the focused test command.
3. Iterate until the focused test passes.
4. If a new missing behavior emerges, return to Red and add or adjust a behavioral test before implementing it.

### 6. Refactor

Only refactor after focused tests are green. Keep refactors request-scoped and re-run focused tests after refactoring.

### 7. Documentation and Release Artifacts

Update user-facing docs when:

- the request or acceptance criteria require it
- behavior or API changes would make existing docs incorrect
- repository rules for the touched path require docs updates

Do not create or modify release/versioning artifacts unless:

- the request explicitly asks for it
- repository rules require it
- package policy clearly requires it for this kind of change

If unsure whether a changeset or release note is needed, report the uncertainty instead of inventing one.

### 8. Final Validation and Repair

Discover validation commands before running them:

1. Inspect the nearest relevant `package.json`.
2. Inspect the root `package.json` when working in a workspace.
3. Prefer focused package/file-level test commands during TDD.
4. Prefer repository-standard validation before completion.

Never claim a validation command passed unless the exact command was run and passed.

If final validation fails:

1. Determine whether each failure is related to the current changes.
2. Fix related failures.
3. Re-run the failed command after each fix.
4. Do not fix unrelated pre-existing failures unless the user explicitly asks.
5. Stop repairing when:
   - the same command fails for the same reason after a fix attempt
   - fixing requires unrelated cleanup
   - fixing requires product/design clarification
   - fixing would significantly expand scope
   - the remaining failure appears pre-existing

After behavioral green, validation fixes may touch production code only to correct issues introduced by the implementation, such as type errors, lint violations, build failures, broken imports/exports, or formatting. Do not expand feature scope during validation repair.

## Commit Guidance

Use commits only when the wrapping skill or user asks for them. When committing:

- Commit coherent review units only.
- Prefer conventional-style commit messages, such as:
  - `test(scope): cover requested behavior`
  - `feat(scope): implement requested behavior`
  - `fix(scope): correct failing behavior`
  - `refactor(scope): simplify implementation`
  - `docs(scope): update usage guidance`
  - `chore(scope): update test configuration`
- Do not create WIP, checkpoint, "fix tests", or "updates" commits.
- Red-test commits are allowed locally to preserve TDD traceability.
- Individual local commits do not need to pass independently.

## Review Workflow

For review-only skills, do not edit files unless the wrapping skill or user explicitly asks for fixes.

Review against:

- requested behavior and acceptance criteria
- relevant project rules and local conventions
- behavioral test coverage and TDD evidence when available
- validation evidence
- scope control and unrelated changes
- documentation/release impact
- risk, maintainability, and user-facing behavior

Classify findings by severity:

- **Blocking**: correctness, safety, build/test breakage, missing required behavior, invalid or absent required behavioral test, or rule violation that should stop merge/completion.
- **Recommended**: maintainability, clarity, additional coverage, docs, or validation improvements that should be considered before merge/completion.
- **Optional**: polish or future follow-up.

Prefer actionable findings with file paths, commands, or examples. Avoid vague criticism.

## Blocked States

Stop and ask the user if:

- the requested behavior is ambiguous enough that implementation would be guesswork
- valid behavioral red cannot be created or observed for an implementation task
- production edits would be required before valid behavioral red
- fixing validation would require unrelated cleanup or significant scope expansion
- project rules or user instructions conflict
- human work would need to be discarded or overwritten

When blocked on strict TDD, report:

1. behavior that needs testing
2. test surface inspected or created
3. why strict TDD is blocked
4. recommended options, such as creating a new test harness, authorizing a one-time implementation-first exception, or clarifying expected behavior

## Final Reporting

Implementation reports should include:

- what changed
- red test command and failure summary
- green test command
- final validation commands and outcomes
- files changed
- remaining risks or follow-up notes

Review reports should include:

- review target
- context/rules considered
- blocking findings
- recommended findings
- optional findings
- validation reviewed or run
- final recommendation
