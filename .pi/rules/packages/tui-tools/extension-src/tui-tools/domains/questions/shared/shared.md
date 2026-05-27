---
kind: rules
paths:
  - 'packages/tui-tools/extension-src/tui-tools/domains/questions/shared/**/*'
summary: Feature-neutral question-domain models and helpers used by queue and asking features.
triggers:
  - QuestionDefinition
  - AnswerRecord
  - QueueSummary
  - validate answer
  - format answer
---

# shared

`shared/` contains feature-neutral contracts and helpers for the questions domain. Enter here when changing question shapes, answer records, queue summaries, answer formatting, validation, or question projection helpers.

## Patterns & Conventions

- Shared code must not import from `features/`; it is the foundation for feature implementations.
- Keep models small and stable because they are part of the questions-domain public API when re-exported from the domain index.
- Put workflow-specific meaning outside this package; shared helpers should describe generic question/answer behavior.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `models/` | Changing public question, answer, or queue-summary contracts. |
| `helpers/` | Changing reusable formatting, validation, answer-record creation, or question projection logic. |
