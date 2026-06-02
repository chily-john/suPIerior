---
kind: rules
paths:
  - 'packages/tui-tools/**/*'
summary: Reusable npm package for Pi TUI primitives used by guided workflow packages.
triggers:
  - tui-tools
  - Pi TUI primitives
  - @supierior/tui-tools
  - reusable TUI package
---

# tui-tools

`@supierior/tui-tools` is the reusable package for extended Pi TUI functionality. Its questions domain is currently paused and is not used by `@supierior/feature-flow`; future work is needed before workflow packages should depend on the question tool again.

## Domain Language

### Question interaction lifecycle

The reusable TUI flow that owns the loading state, prompt display, answer capture, submitted-answer context, input locking, and cleanup around asking guided workflow questions.

### Question session

A long-lived question interaction lifecycle instance and the single public interaction point for guided question UI. Its default state is loading: it shows Pi's working spinner/message and locks input until a question is asked. Asking a question temporarily replaces loading with the prompt, captures the answer, then automatically returns to loading. Submitted-answer context may be displayed as an existing convenience, but it is not load-bearing. Workflows do not tell it to load while doing other work; loading is the baseline state between questions. Workflow phase and workflow status remain owned by the consuming workflow, not by tui-tools. Standalone one-shot asking, standalone loading helpers, queued asking, and QuestionQueue are legacy implementation paths, not separate domain concepts.

## Patterns & Conventions

- Keep the package Pi-aware through peer types, but keep reusable primitives independent from a specific workflow package where possible.
- Public API should remain available from the package root; add domain-level subpath exports only for coherent domains.
- Prefer structural changes that preserve behavior unless the user explicitly asks for behavior changes.
- Treat question lifecycle behavior as future-work territory while the question tool is paused; avoid adding new consumers until the design is revisited.
- Existing question UI lifecycle coverage should use `packages/tui-tools/tests/support/createQuestionUiHarness()` to exercise public question behavior.
- Use `timelineText()` for lifecycle-order assertions and `screen(width)` for human-readable visible-state assertions; prefer asserting both when loading/working state must be visible during an active period.
- For width-sensitive widget tests, use `renderWidget(key, width)` and include assertion messages that print rendered lines with their lengths so wrapping regressions are easy to diagnose.
- Loading lifecycle tests must assert intended context and working state during the active loading period, not only after stop/cleanup.
- For async question gaps, use deferred promises rather than sleeps/timers: submit the current answer, wait until the deferred async work has started, assert `working:indicator`, `working:visible true`, and `screen(width)` while the deferred promise is still pending, then resolve it and assert loading stops before the next question is shown.
- Fast local loop for future question-tool work:
  ```bash
  pnpm --filter @supierior/tui-tools test
  pnpm --filter @supierior/tui-tools typecheck
  ```

## Subdirectories

| Directory        | When to enter                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `extension-src/` | Adding or changing reusable TUI domains, public exports, or internal source organization. |
| `scripts/`       | Updating dependency-cruiser rules that enforce TUI domain boundaries.                     |
| `tests/`         | Adding or updating tests for reusable TUI primitives.                                     |
