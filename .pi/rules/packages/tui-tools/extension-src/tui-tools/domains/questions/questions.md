---
kind: rules
paths:
  - 'packages/tui-tools/extension-src/tui-tools/domains/questions/**/*'
summary: Questions domain for reusable guided-question queues, asking helpers, models, and public exports.
triggers:
  - QuestionQueue
  - askQueue
  - askQuestion
  - question definition
  - answer record
  - question queue
---

# questions

The questions domain owns reusable primitives for guided workflows that ask ordered questions and record answers. Consumers may import from the package root or the `@supierior/tui-tools/questions` subpath; keep the domain index as the domain-level public surface.

## Patterns & Conventions

- Maintain dependency direction: `shared/models` → `shared/helpers` → `features/*` → domain `index.ts` → package root.
- `shared/models` define contracts and value types; `shared/helpers` may import shared models but must not import feature implementations.
- Feature implementations may import shared models/helpers. Avoid feature-to-feature imports unless intentional; if needed, import through the other feature's `index.ts`.
- Current intentional dependency: `asking` may depend on `queue` through the queue feature entrypoint; `queue` must not depend on `asking`.
- Use the `@/` TypeScript alias for cross-folder internal source imports. Relative imports are fine for nearby files in the same feature/model/helper folder.
- Tests should mirror this domain under `tests/domains/questions/<feature>/`.

## Subdirectories

| Directory | When to enter |
| --- | --- |
| `features/` | Changing user-facing question capabilities such as asking questions or managing a queue. |
| `shared/` | Changing question contracts, answer records, queue summaries, validation, formatting, or other feature-neutral helpers. |
