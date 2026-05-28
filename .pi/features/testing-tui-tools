# Testing TUI Tools Feedback Loop Handoff

## Goal

Improve `@supierior/tui-tools` testing so agents can use TDD and quickly verify TUI behavior, especially question/loader lifecycle behavior. The immediate target is the questions domain in `packages/tui-tools`, but the approach should be reusable for future TUI features.

## Context

Relevant package:

- `packages/tui-tools`

Relevant files:

- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-question.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/ask-queue.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/queue/question-queue.ts`
- `packages/tui-tools/extension-src/tui-tools/domains/questions/features/asking/models/pi-question-ui.ts`
- `packages/tui-tools/tests/domains/questions/asking/ask-question.test.ts`
- `packages/tui-tools/tests/domains/questions/asking/ask-queue.test.ts`
- `packages/tui-tools/tests/domains/questions/queue/question-queue.test.ts`

The package already uses Vitest. Keep Vitest as the main runner.

## Core Recommendation

Build a reusable fake TUI test harness around `PiQuestionUi`.

The harness should:

- implement `PiQuestionUi`
- record ordered UI events
- provide plain-text screen previews
- support scripted terminal/editor input
- make lifecycle assertions easy
- produce failure output that agents can understand quickly

Do not start with full terminal emulation or conversation/LLM testing. Use fake UI and deterministic async control first.

## Problem This Should Catch

A previous agent was asked to add Pi's default loading spinner between questions. The implementation failed: the loader did not appear, and the agent may have believed it had implemented it.

The new test setup must be able to verify scenarios like:

1. Question 1 is visible.
2. User submits an answer.
3. Loading state starts while async work/model work is pending.
4. Pi working indicator/spinner is shown.
5. Prior question/answer context remains visible if intended.
6. Terminal input is consumed while loading.
7. Loading state stops when async work resolves.
8. Question 2 appears.

This is primarily a temporal/lifecycle test, not just a final snapshot test.

## Suggested Test Layers

### Layer 1: Pure Logic Tests

Keep and expand existing tests for:

- `QuestionQueue`
- answer validation
- answer formatting
- progress text
- rebase behavior

These should stay fast and deterministic.

### Layer 2: Fake TUI Interaction Tests

Highest priority.

Use the reusable harness to test:

- prompt widget shown
- prompt widget cleared
- help/status lifecycle
- editor text set/cleared
- enter submits current editor value
- escape/ctrl-c cancels
- loading starts/stops
- working indicator/message/visibility lifecycle
- terminal input consumed during loading
- widget wrapping at narrow widths

### Layer 3: Workflow Orchestration Tests

Likely belongs in `packages/feature-flow`, not just `tui-tools`.

`tui-tools` should prove `beginQuestionLoading()` works. The workflow package should prove the loader is called at the correct time between questions.

### Layer 4: Headless Terminal Tests

Optional later. Pi's own TUI package appears to use `@xterm/headless`, but do not start there unless fake UI tests are insufficient.

## Harness Design Ideas

Create a test support module, likely under:

- `packages/tui-tools/tests/support/`

Possible helper name:

- `createQuestionUiHarness()`
- `createTuiHarness()`

The initial version can be question-focused but should be designed generically enough to reuse.

Useful harness API ideas:

```ts
const ui = createQuestionUiHarness();

ui.events();
ui.timelineText();
ui.screen(80);
ui.renderWidget("feature-flow-question", 80);
ui.enter();
ui.escape();
ui.ctrlC();
ui.type("answer");
ui.setEditorValue("answer");
```

Possible event types:

```ts
type TuiTestEvent =
  | { type: "status:set"; key: string; value: string | undefined }
  | { type: "widget:set"; key: string; placement?: string }
  | { type: "widget:clear"; key: string }
  | { type: "editor:setText"; value: string }
  | { type: "editor:getText"; value: string }
  | { type: "terminal:subscribe" }
  | { type: "terminal:unsubscribe" }
  | { type: "terminal:input"; data: string; consumed: boolean }
  | { type: "working:indicator" }
  | { type: "working:message"; value?: string }
  | { type: "working:visible"; value: boolean }
  | { type: "input:prompt"; prompt: string; placeholder?: string }
  | { type: "select:prompt"; prompt: string; options: string[] }
  | { type: "confirm:prompt"; title: string; message: string };
```

## Plain Text Screen Preview

Agents need to see what changed. Add a screen rendering helper that turns fake UI state into text.

Example output:

```txt
[aboveEditor:feature-flow-question]
What should we build?

[editor]
A better loading state

[status:feature-flow-help]
Describe the feature.
```

For loading:

```txt
[aboveEditor:feature-flow-question]
What should we build?

Answer: A better loading state

[working]
Thinking…
```

This should be used in snapshots or failure messages.

## Lifecycle Timeline Assertions

Loader behavior needs ordered event verification.

Example expected order:

```txt
widget:set feature-flow-question
editor:setText ""
terminal:subscribe
terminal:input "\r" consumed
widget:set loading-context
working:indicator
working:message Thinking…
working:visible true
working:visible false
working:message cleared
working:indicator cleared
widget:set next-question
```

The harness should make it easy to assert ordered subsequences, not necessarily exact full timelines.

Example conceptual assertion:

```ts
expectTimeline(ui).toContainOrdered([
  "terminal:input enter",
  "working:indicator",
  "working:visible true",
  "working:visible false",
  "widget:set next-question",
]);
```

## Async Gap Testing

To verify loaders, tests must simulate pending async work. Avoid sleeps. Use deferred promises.

Conceptual scenario:

```ts
const nextQuestion = deferred<QuestionDefinition>();

const run = startWorkflow({ ui, nextQuestion: nextQuestion.promise });

ui.answerInline("Add loading spinner");

expect(ui).toHaveWorkingVisible(true);
expect(ui.timelineText()).toContain("working:indicator");

nextQuestion.resolve(question2);
await run;

expect(ui).toHaveWorkingVisible(false);
expect(ui.screen(80)).toContain("Question 2");
```

The exact implementation can differ, but the important design is: assert during the pending period, not only after everything completes.

## First Tests to Add or Refactor

Start by refactoring one existing `ask-question.test.ts` case to use the harness. Then add focused tests.

Recommended `tui-tools` tests:

1. `beginQuestionLoading` starts Pi working state.
2. `beginQuestionLoading` renders prior question/answer context.
3. `beginQuestionLoading` consumes terminal input until stopped.
4. `beginQuestionLoading` clears widget and working state on stop.
5. Text question renders prompt widget and submits editor text on enter.
6. Text question cancels on escape or ctrl-c.
7. Multi-choice question parses comma-separated inline editor text.
8. Choice question calls `select` with option values.
9. Confirm question calls `confirm` with prompt/help text.
10. Rendered widget lines never exceed requested width for narrow widths.

Recommended later workflow/orchestration test:

- answering one question shows loader while next question/model work is pending, then hides loader before showing next question.

## Trunk-Based Development Considerations

If moving toward trunk-based development, optimize for very fast deterministic checks.

Local agent loop should be:

```bash
pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
pnpm --filter @supierior/tui-tools test
pnpm --filter @supierior/tui-tools typecheck
```

CI/trunk gate should remain simple:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Avoid slow or flaky tests in the normal gate. Headless terminal and conversation eval tests can be separate later.

## Non-Goals for Initial Implementation

Do not initially implement:

- full Pi interactive mode testing
- real LLM/conversation evals
- LLM-as-judge tests
- Playwright-style terminal screenshots
- `@xterm/headless` unless fake UI tests cannot cover the behavior
- a custom test runner

## Success Criteria

The implementation is successful if an agent can:

1. Write a failing test for a TUI lifecycle behavior.
2. Run a fast targeted Vitest command.
3. See a clear failure timeline/screen preview.
4. Implement the behavior.
5. Re-run the same test and see it pass.

The specific historical failure should become impossible to miss: if the loader is not shown between answered question and next pending work, a test should fail with a clear missing `working:indicator` / `working:visible true` event.
