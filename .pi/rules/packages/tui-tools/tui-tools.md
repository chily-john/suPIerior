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

`@supierior/tui-tools` is the reusable package for extended Pi TUI functionality. Other workspace packages should depend on it when they need reusable TUI primitives instead of duplicating UI orchestration logic.

## Patterns & Conventions

- Keep the package Pi-aware through peer types, but keep reusable primitives independent from a specific workflow package where possible.
- Public API should remain available from the package root; add domain-level subpath exports only for coherent domains.
- Prefer structural changes that preserve behavior unless the user explicitly asks for behavior changes.
- For question UI lifecycle coverage, use `packages/tui-tools/tests/support/createQuestionUiHarness()` to exercise public question behavior.
- Use `timelineText()` for lifecycle-order assertions and `screen(width)` for human-readable visible-state assertions; prefer asserting both when loading/working state must be visible during an active period.
- For width-sensitive widget tests, use `renderWidget(key, width)` and include assertion messages that print rendered lines with their lengths so wrapping regressions are easy to diagnose.
- Loading lifecycle tests must assert intended context and working state during the active loading period, not only after stop/cleanup.
- For async question gaps, use deferred promises rather than sleeps/timers: submit the current answer, wait until the deferred async work has started, assert `working:indicator`, `working:visible true`, and `screen(width)` while the deferred promise is still pending, then resolve it and assert loading stops before the next question is shown.
- Fast local loop for async question/loading work:
  ```bash
  pnpm --filter @supierior/tui-tools test -- tests/domains/questions/asking/ask-question.test.ts
  pnpm --filter @supierior/tui-tools test
  pnpm --filter @supierior/tui-tools typecheck
  ```

## Subdirectories

| Directory        | When to enter                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `extension-src/` | Adding or changing reusable TUI domains, public exports, or internal source organization. |
| `scripts/`       | Updating dependency-cruiser rules that enforce TUI domain boundaries.                     |
| `tests/`         | Adding or updating tests for reusable TUI primitives.                                     |
