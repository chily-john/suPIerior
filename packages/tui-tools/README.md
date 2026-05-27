# @supierior/tui-tools

Reusable TUI primitives for guided workflows.

V1 includes the questions domain, which supports free-text, choice, multi-choice, and confirm questions; validated one-at-a-time asking; queue mutation/rebase; answer summaries; and footer status progress while questions are active.

Consumers can import from the package root or from a domain entrypoint:

```ts
import { QuestionQueue, askQueue } from "@supierior/tui-tools";
import { QuestionQueue } from "@supierior/tui-tools/questions";
```
