# @supierior/tui-tools

Reusable TUI primitives for guided workflows.

V1 includes the questions domain, which supports free-text, choice, multi-choice, and confirm questions; validated one-at-a-time asking; queue mutation/rebase; answer summaries; footer status progress while questions are active; and a persistent `QuestionSession` lifecycle primitive.

Consumers can import from the package root or from a domain entrypoint:

```ts
import { QuestionQueue, askQueue, createQuestionSession } from "@supierior/tui-tools";
import { QuestionQueue, createQuestionSession } from "@supierior/tui-tools/questions";
```

## Persistent question sessions

`createQuestionSession(ui, options)` creates a reusable question UI owner. A new session starts in loading immediately, restores Pi's default working spinner/message, keeps terminal input consumed while loading, and cleans up widgets/status/working state when disposed.

Call `ask(question)` to temporarily replace loading with the prompt input. It returns an `AnswerRecord` only after loading has been restored with submitted question/answer context, so callers can start async work immediately after `await questions.ask(...)` without manually wrapping the call in question loading helpers.

```ts
const questions = createQuestionSession(ui, {
  phase: "Discovery",
  statusKey: "generated-questions",
  loadingMessage: "Analyzing discovery…",
});

try {
  while (nextQuestion) {
    const record = await questions.ask(nextQuestion, { estimatedRemaining: 2 });
    await model.complete(renderPrompt(record)); // loading remains visible here
    nextQuestion = pickNextQuestion();
  }
} finally {
  questions.dispose();
}
```
