# Testing TUI Tools Implementation Issues

These issues break the `testing-tui-tools` handoff into vertical, testable GitHub issues. Each issue must be implemented with strict behavioral-red TDD: write or update a compiling/runnable behavioral test first, run the targeted Vitest command, then implement only enough code to pass.

Documentation is not split into a final documentation-only issue. When a story introduces a reusable testing pattern, update the canonical rules documentation in `.pi/rules/packages/tui-tools/tui-tools.md` as part of that same story so future agents discover the pattern through the pi-rules system.

These issue bodies are intended to be copied into GitHub issues. Keep each issue self-contained because the `issue-implementor` skill reads the GitHub issue body/title/labels via `gh issue view` and does not read this aggregate planning file by default.

## Common implementation contract

Use this contract for every issue unless the issue says otherwise.

### Package

`packages/tui-tools`

### Relevant project rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

### TDD requirements

- The required red state must be a compiling/runnable behavioral Vitest failure.
- TypeScript errors, missing imports/exports, syntax errors, missing test files, missing helper files, and test-framework setup failures do not count as valid red.
- It is acceptable to create or adjust test files, fixtures, mocks, test-support helpers, or minimal compiling test-support stubs before observing red when needed to reach a meaningful behavioral assertion failure.
- Do not edit production code before valid behavioral red.

### Documentation/rules policy

- Update `.pi/rules/packages/tui-tools/tui-tools.md` in the same issue only when the issue introduces or changes a reusable testing convention.
- Do not create a separate docs-only issue for testing conventions introduced here.

### Non-goals

- Do not add full Pi interactive mode testing.
- Do not add real LLM/conversation evals.
- Do not add LLM-as-judge tests.
- Do not add Playwright-style terminal screenshots.
- Do not add `@xterm/headless` unless fake UI tests cannot cover the behavior in the issue.
- Do not add a custom test runner.
- Do not change package ownership or move behavior into another package unless a specific issue explicitly requires it.

## Harness event vocabulary

Use stable, plain-text timeline entries resembling the following. The exact TypeScript event model can differ, but `timelineText()` should produce readable, predictable lines in this vocabulary so failures are easy for agents to diagnose.

- `widget:set <key>`
- `widget:clear <key>`
- `status:set <key> "<value>"`
- `status:clear <key>`
- `help:set <key> "<value>"`
- `help:clear <key>`
- `editor:setText "<value>"`
- `editor:getText "<value>"`
- `terminal:subscribe`
- `terminal:unsubscribe`
- `terminal:input <key-or-data> consumed=<true|false>`
- `working:indicator`
- `working:indicator cleared`
- `working:message "<value>"`
- `working:message cleared`
- `working:visible true`
- `working:visible false`
- `input:prompt "<prompt>"`
- `select:prompt "<prompt>" options=<values>`
- `confirm:prompt "<prompt>"`

Prefer ordered-subsequence assertions for lifecycle behavior instead of exact full-timeline assertions unless the exact full timeline is the behavior under test.

## Dependency map

- Issue 1 has no blocker and creates the first usable vertical harness slice.
- Issue 2 is blocked by Issue 1.
- Issue 3 is blocked by Issues 1 and 2.
- Issues 4 and 5 are blocked by Issue 1.
- Issue 6 is blocked by Issues 1 and 2.
- Issue 7 is blocked by Issues 1, 2, and 3.
- Issue 8 is blocked by Issue 7 and belongs to `packages/feature-flow`, not `packages/tui-tools`.

---

## Issue 1: Test text question render/submit through a reusable question UI harness

### Blocked by

None.

### Goal

Create the first vertical fake `PiQuestionUi` harness slice by proving one real text-question flow can be tested through public question asking behavior: render a text question, submit editor text, and inspect ordered lifecycle events.

### Implementation Contract

#### Package

`packages/tui-tools`

#### Likely files

- `packages/tui-tools/tests/support/`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-question.ts` only if the behavioral test exposes a production behavior gap
- `.pi/rules/packages/tui-tools/tui-tools.md`

#### Relevant rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

#### Required TDD red

Add or refactor a behavioral Vitest test that compiles and fails because a text-question interaction cannot yet be observed through the harness timeline or does not produce the expected render/submit lifecycle.

Because this issue introduces test support, the agent may create a minimal compiling `createQuestionUiHarness()` test-support stub before observing red. The valid red must be a behavioral assertion failure showing that ordered events, submitted editor text, or `timelineText()` output are missing or incomplete.

#### Focused validation

```bash
pnpm --filter @supierior/tui-tools test -- tests/support
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

#### Non-goals

- Do not implement full screen preview rendering in this issue.
- Do not implement every `PiQuestionUi` method up front.
- Do not add choice, multi-choice, confirm, loading, cancellation, or wrapping coverage except as required by one text-question render/submit path.

### Scope

- Add `createQuestionUiHarness()` under `packages/tui-tools/tests/support/`.
- Implement only the `PiQuestionUi` surface needed by one text-question render/submit test.
- Record ordered events for the text-question path, including relevant widget, editor, terminal subscription/input, and cleanup calls.
- Expose:
  - `events()`
  - `timelineText()`
  - `clearEvents()`
- Add harness-focused tests for event ordering and readable timeline output needed by this slice.
- Refactor or add one `ask-question.test.ts` text-question case to use the harness without changing intended behavior.
- Update `.pi/rules/packages/tui-tools/tui-tools.md` with a short testing convention that points agents to the harness for question UI lifecycle tests.

### Tests

Add tests proving that:

- events are recorded in call order
- `timelineText()` includes enough detail to diagnose missing lifecycle calls
- the text question renders the prompt widget through the public question API
- pressing enter submits the current editor value through the public question API
- terminal subscription is cleaned up after completion

### Acceptance Criteria

- The harness can be used anywhere a `PiQuestionUi` is required for the tested text-question path.
- Timeline output is plain text and easy to read in assertion failures.
- The text-question render/submit path is covered as a vertical UI interaction.
- The pi-rules documentation tells future agents where the harness lives and when to use it.
- Targeted commands pass:

```bash
pnpm --filter @supierior/tui-tools test -- tests/support
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

---

## Issue 2: Test loading lifecycle with timeline and screen preview

### Blocked by

- Issue 1: Test text question render/submit through a reusable question UI harness

### Goal

Verify that `beginQuestionLoading()` shows Pi working/loading state while loading is active and cleans it up when loading stops, with failure output that includes both lifecycle timeline and visible screen state.

### Implementation Contract

#### Package

`packages/tui-tools`

#### Likely files

- `packages/tui-tools/tests/support/`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-question.ts`
- `.pi/rules/packages/tui-tools/tui-tools.md`

#### Relevant rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

#### Required TDD red

Add a behavioral Vitest test that compiles and fails because `beginQuestionLoading()` does not produce the required active-loading working-state timeline and/or visible screen preview during the pending loading period.

If screen preview helpers are missing, create the minimal compiling helper surface first. The valid red must be an assertion failure about missing or incorrect loading behavior, not a missing helper/import failure.

#### Focused validation

```bash
pnpm --filter @supierior/tui-tools test -- tests/support
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

#### Non-goals

- Do not test terminal input consumption in this issue.
- Do not test choice/multi-choice/confirm prompts in this issue.
- Do not add full workflow orchestration between multiple packages.

### Scope

- Extend the harness with screen preview helpers needed by loading assertions, such as:
  - `screen(width)`
- Do not add `renderWidget(key, width)` unless needed by this issue's tests.
- Include visible sections needed by loading tests, such as:
  - above-editor widgets
  - editor text
  - status/help text
  - working indicator/message state
- Add or update `beginQuestionLoading()` tests using the harness timeline and screen preview.
- Implement or fix production behavior only as needed.
- Update `.pi/rules/packages/tui-tools/tui-tools.md` with guidance to use `screen(width)` for visible-state assertions and `timelineText()` for lifecycle-order assertions.

### Tests

Add tests proving:

- loading start records a `working:indicator` event
- loading start sets a working/loading message when configured
- loading start sets `working:visible true`
- the active loading period is assertable before stop/cleanup
- `screen(width)` includes visible loading/working state during the active loading period
- stopping loading sets `working:visible false`
- stopping loading clears working message/indicator as appropriate
- ordered timeline contains start events before stop events
- cleared sections are omitted from `screen(width)` after clear calls

### Acceptance Criteria

- A missing loader produces a failing test with a clear timeline and/or screen preview.
- Assertions check the pending/loading period, not only final state.
- Tests can assert against a human-readable screen preview.
- The pi-rules documentation distinguishes screen preview assertions from timeline assertions.
- Targeted commands pass:

```bash
pnpm --filter @supierior/tui-tools test -- tests/support
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

---

## Issue 3: Test loading context and terminal input consumption

### Blocked by

- Issue 1: Test text question render/submit through a reusable question UI harness
- Issue 2: Test loading lifecycle with timeline and screen preview

### Goal

Ensure loading preserves intended question/answer context and consumes terminal input while loading is active, then stops consuming input after loading stops.

### Implementation Contract

#### Package

`packages/tui-tools`

#### Likely files

- `packages/tui-tools/tests/support/`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-question.ts`
- `.pi/rules/packages/tui-tools/tui-tools.md`

#### Relevant rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

#### Required TDD red

Add a behavioral Vitest test that compiles and fails because active loading does not preserve visible context or does not consume terminal input as required.

The red failure must be an assertion against `screen(width)`, `timelineText()`, or an equivalent harness-observed behavior.

#### Focused validation

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

#### Non-goals

- Do not add prompt variant coverage in this issue.
- Do not add async workflow orchestration across question steps in this issue.

### Scope

- Extend `beginQuestionLoading()` tests using the harness.
- Verify visible context during loading through `screen(width)`.
- Verify terminal input is consumed while loading and no longer consumed after loading stops.
- Add only the harness input helpers needed by this issue.
- Update `.pi/rules/packages/tui-tools/tui-tools.md` with the convention that loading tests must assert during the active loading period, not only after stop/cleanup.

### Tests

Add tests for:

- prior question text remains visible during loading when intended
- submitted answer is rendered during loading when intended
- terminal input events during loading are marked `consumed=true`
- terminal input is not consumed after loading stop/unsubscribe
- loading context widget is cleared on stop

### Acceptance Criteria

- During a pending loading state, screen preview shows the expected context and working state.
- Terminal input cannot leak through while loading is active.
- Terminal input is no longer consumed after loading cleanup.
- The active-loading assertion rule is recorded in `.pi/rules/packages/tui-tools/tui-tools.md`.
- Targeted command passes:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

---

## Issue 4: Cover text-question cancellation with the harness

### Blocked by

- Issue 1: Test text question render/submit through a reusable question UI harness

### Goal

Use the harness to test text-question cancellation behavior through public asking APIs and fake UI input, with deterministic no-sleep tests.

### Implementation Contract

#### Package

`packages/tui-tools`

#### Likely files

- `packages/tui-tools/tests/support/`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-question.ts`
- `.pi/rules/packages/tui-tools/tui-tools.md` only if a reusable input-scripting convention is introduced

#### Relevant rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

#### Required TDD red

Add a behavioral Vitest test that compiles and fails because escape or ctrl-c cancellation is not observable or does not clean up through the harness-backed public question API.

#### Focused validation

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

#### Non-goals

- Do not cover choice, multi-choice, or confirm prompts in this issue.
- Do not add loading behavior in this issue.

### Scope

- Add or refactor `ask-question.test.ts` cases for text question cancellation.
- Use scripted harness input instead of direct implementation coupling where possible.
- Keep tests deterministic with no sleeps.
- Update `.pi/rules/packages/tui-tools/tui-tools.md` only if this story introduces new reusable input-scripting conventions.

### Tests

Add tests for:

- escape cancels the question
- ctrl-c cancels the question
- editor text is cleared or preserved according to existing intended behavior after cancellation
- terminal subscription is cleaned up after cancellation
- cancellation calls appear in timeline output with useful details

### Acceptance Criteria

- Text-question cancellation is testable as a vertical UI interaction.
- Cancel behavior is proven through public asking APIs and fake UI events.
- Any reusable input-scripting convention is documented in the pi-rules file.
- Targeted command passes:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

---

## Issue 5: Cover choice, multi-choice, and confirm question interactions

### Blocked by

- Issue 1: Test text question render/submit through a reusable question UI harness

### Goal

Ensure non-text question types are testable through the same harness and preserve existing behavior.

### Implementation Contract

#### Package

`packages/tui-tools`

#### Likely files

- `packages/tui-tools/tests/support/`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-question.ts`
- `.pi/rules/packages/tui-tools/tui-tools.md` only if a reusable prompt-testing convention is introduced

#### Relevant rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

#### Required TDD red

Add a behavioral Vitest test that compiles and fails because choice, multi-choice, or confirm prompt behavior is missing, incorrect, or not observable through harness events.

#### Focused validation

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

#### Non-goals

- Do not change prompt semantics unless the failing behavioral test exposes a bug that must be fixed intentionally.
- Do not add loading or wrapping coverage in this issue.

### Scope

- Add or refactor question asking tests for choice, multi-choice, and confirm prompts.
- Record prompt calls and selected values through harness events.
- Update `.pi/rules/packages/tui-tools/tui-tools.md` only if this story introduces new reusable prompt-testing conventions.

### Tests

Add tests for:

- multi-choice question parses comma-separated inline editor text
- choice question calls `select` with expected option values
- confirm question calls `confirm` with expected prompt/help text
- prompt calls appear in timeline output with useful details

### Acceptance Criteria

- Each supported non-text question type has a harness-backed interaction test.
- Existing behavior is preserved unless a bug is found and fixed intentionally.
- Any reusable prompt-testing convention is documented in the pi-rules file.
- Targeted command passes:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

---

## Issue 6: Add widget wrapping tests for narrow screen widths

### Blocked by

- Issue 1: Test text question render/submit through a reusable question UI harness
- Issue 2: Test loading lifecycle with timeline and screen preview

### Goal

Catch layout regressions by proving rendered question widgets respect requested screen width and produce readable failure output.

### Implementation Contract

#### Package

`packages/tui-tools`

#### Likely files

- `packages/tui-tools/tests/support/`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-question.ts`
- `.pi/rules/packages/tui-tools/tui-tools.md`

#### Relevant rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

#### Required TDD red

Add a behavioral Vitest test that compiles and fails because rendered question widget lines exceed the requested width or wrapping is not inspectable through the harness screen/widget output.

If a dedicated `renderWidget(key, width)` helper is needed, create the minimal compiling helper surface first. The valid red must be an assertion about rendered width/wrapping behavior, not a missing helper/import failure.

#### Focused validation

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

#### Non-goals

- Do not add new layout engines.
- Do not rewrite unrelated widget rendering.
- Do not add terminal screenshot tests.

### Scope

- Use the harness screen/widget rendering helpers to test narrow widths.
- Add `renderWidget(key, width)` only if needed by these tests.
- Add production fixes only if current rendering exceeds width.
- Update `.pi/rules/packages/tui-tools/tui-tools.md` with guidance for width-sensitive TUI tests if the helper API or assertion pattern is reusable.

### Tests

Add tests proving:

- rendered widget lines do not exceed the requested width
- question prompt/help/progress text wrap predictably at narrow widths
- screen preview remains readable after wrapping
- a width regression fails with output that shows the offending rendered lines

### Acceptance Criteria

- Width-sensitive question rendering has harness-backed coverage.
- A width regression fails with output that shows the offending rendered lines.
- Reusable width assertion guidance is documented in the pi-rules file if introduced.
- Targeted command passes:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

---

## Issue 7: Add async gap test proving loader visibility inside tui-tools

### Blocked by

- Issue 1: Test text question render/submit through a reusable question UI harness
- Issue 2: Test loading lifecycle with timeline and screen preview
- Issue 3: Test loading context and terminal input consumption

### Goal

Make the historical `tui-tools` failure impossible to miss: after one question is answered, loading must be visible while the next async step is pending.

This issue is limited to `packages/tui-tools`. Do not add `packages/feature-flow` tests in this issue. Use the smallest existing `tui-tools` orchestration surface that can prove loading remains visible during a deferred async gap.

### Implementation Contract

#### Package

`packages/tui-tools`

#### Likely files

- `packages/tui-tools/tests/support/`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/tests/domains/questions/asking/ask-queue.test.ts` only if it is the smallest existing tui-tools orchestration surface
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/`
- `.pi/rules/packages/tui-tools/tui-tools.md`

#### Relevant rules

- `.pi/rules/packages/tui-tools/tui-tools.md`
- `.pi/rules/packages/tui-tools/tests/tests.md`

#### Required TDD red

Add a deterministic behavioral Vitest test using deferred promises, not sleeps, that compiles and fails because working/loading state is not visible during the pending async gap.

The red failure must occur while the deferred work is still pending and should clearly mention missing `working:indicator` and/or `working:visible true` behavior.

#### Focused validation

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

Also run before PR:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
pnpm --filter @supierior/tui-tools test
pnpm --filter @supierior/tui-tools typecheck
```

#### Non-goals

- Do not add `packages/feature-flow` workflow tests in this issue.
- Do not use sleeps/timers when deferred promises can make the test deterministic.
- Do not add real LLM/model calls.

### Scope

- Add a deterministic async test using deferred promises.
- Prefer the smallest `tui-tools` orchestration surface that can prove `beginQuestionLoading()` works during a pending gap.
- Update `.pi/rules/packages/tui-tools/tui-tools.md` with the final recommended async-gap test pattern and fast validation loop.

### Tests

Add a test scenario where:

1. Question 1 is visible.
2. User submits an answer.
3. Async next-step work remains pending.
4. The harness asserts `working:indicator` and `working:visible true` during the pending period.
5. The deferred work resolves.
6. Loading stops before the next question is shown.

### Acceptance Criteria

- The test fails clearly if `working:indicator` or `working:visible true` is missing.
- The test asserts during the pending period before resolving the deferred promise.
- The pi-rules documentation includes the recommended fast local loop:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
pnpm --filter @supierior/tui-tools test
pnpm --filter @supierior/tui-tools typecheck
```

- Targeted command passes:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
```

---

## Issue 8: Add feature-flow workflow regression test for loader between generated questions

### Blocked by

- Issue 7: Add async gap test proving loader visibility inside tui-tools

### Goal

Add the package-level follow-up for the historical workflow failure: `packages/feature-flow` should show the loader between an answered question and the next generated question while async work is pending.

This issue belongs to `packages/feature-flow`, not `packages/tui-tools`. It should use the reusable `tui-tools` harness/patterns introduced by the previous issues where practical.

### Implementation Contract

#### Package

`packages/feature-flow`

#### Likely files

- `packages/feature-flow/tests/` or the nearest existing workflow test location
- `packages/feature-flow/extension-src/` workflow orchestration files
- `.pi/rules/packages/feature-flow/feature-flow.md`
- `.pi/rules/packages/feature-flow/tests/tests.md` if present/applicable
- `.pi/rules/packages/tui-tools/tui-tools.md` only for referenced testing conventions, not for new feature-flow-specific guidance

#### Relevant rules

Read the matching feature-flow rules for the touched paths before editing. Also use `.pi/rules/packages/tui-tools/tui-tools.md` for the reusable TUI harness/testing conventions.

#### Required TDD red

Add a deterministic behavioral workflow test that compiles and fails because the feature-flow orchestration does not show loading while waiting for the next generated question.

The red failure must be an assertion during the pending period, not a final-state-only assertion.

#### Focused validation

Use the nearest package-local feature-flow test command discovered from `packages/feature-flow/package.json`. If available, prefer a focused command for the workflow test file, then run package-local tests and typecheck before PR.

#### Non-goals

- Do not modify `tui-tools` behavior in this issue unless a bug is proven and cannot be fixed in feature-flow.
- Do not add real LLM/model calls.
- Do not use sleeps for async timing.

### Scope

- Add a workflow-level test using deferred promises or equivalent deterministic async control.
- Prove the loader is visible between the answered question and the next generated question.
- Use existing feature-flow orchestration surfaces rather than creating a parallel workflow runner.
- Update feature-flow-specific rules documentation only if a reusable feature-flow testing convention is introduced.

### Tests

Add a test scenario where:

1. Feature-flow question 1 is visible.
2. User submits an answer.
3. The next generated question/model step remains pending.
4. The test asserts loader/working state is visible during the pending period.
5. The deferred work resolves.
6. Loading stops before question 2 is shown.

### Acceptance Criteria

- The historical workflow failure is covered at the feature-flow package level.
- The test is deterministic and sleep-free.
- The test fails clearly if loading is not visible during the pending gap.
- Package-local focused tests pass.
