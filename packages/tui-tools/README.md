# @supierior/tui-tools

Reusable TUI primitives for guided workflows.

## Current status

The questions domain is paused and is not used by `@supierior/feature-flow` right now. Guided workflows should use Pi's normal chat/input prompts until the question tool gets future design and reliability work.

The existing questions code remains in this package for that future work. It includes a persistent `QuestionSession` concept for free-text, choice, multi-choice, and confirm questions, but consumers should treat it as inactive/experimental for now.
