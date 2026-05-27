---
kind: rules
paths:
  - 'packages/tui-tools/extension-src/tui-tools/domains/questions/features/**/*'
summary: Question-domain feature implementations for asking questions and managing queues.
triggers:
  - askQueue implementation
  - askQuestion implementation
  - QuestionQueue implementation
  - question feature
---

# features

Enter here when changing executable question-domain behavior rather than shared contracts. Feature entrypoints are internal domain organization points; do not add package-level feature subpath exports by default.

## Patterns & Conventions

- Keep feature-to-feature dependencies rare and intentional. `asking` may use `queue`, but only through `features/queue/index.ts`.
- Use `beginQuestionLoading` for model-thinking pauses that should clear editor text, show submitted question/answer context above the editor when present, publish Pi working state, and temporarily consume terminal input.
- Render text and multi-choice prompts with an above-editor widget when using the multiline editor so prompts are not truncated.
- Use `PiWidgetFactory`/`PiWidgetComponent` for dynamic widgets that render against terminal width or handle input.
- Keep `QuestionQueue.rebase` for model-revised unanswered question sets; preserve answer records and progress adjustment indicators.
- When adding another feature, create a feature folder with its own `index.ts`, models when needed, and implementation files.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `asking/` | Changing how questions are rendered through a Pi-like UI, loading-state helpers, how queue progress status is set, or how UI answers are converted. |
| `queue/` | Changing queue mutation, rebase behavior, answer resolution, progress summaries, active-question selection, or completed answer records. |
