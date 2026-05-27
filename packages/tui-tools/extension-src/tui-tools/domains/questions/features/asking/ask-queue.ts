import type { QuestionQueue } from "@/domains/questions/features/queue";
import type { AnswerRecord } from "@/domains/questions/shared/models/answer-record";
import { askQuestion } from "./ask-question";
import type { AskQueueOptions } from "./models/ask-queue-options";
import type { PiQuestionUi } from "./models/pi-question-ui";

export async function askQueue(
  ui: PiQuestionUi,
  queue: QuestionQueue,
  options: AskQueueOptions = {},
): Promise<AnswerRecord[]> {
  const statusKey = options.statusKey ?? "feature-flow";
  while (queue.active) {
    ui.setStatus(statusKey, queue.getProgress().statusText);
    const answer = await askQuestion(ui, queue.active);
    await queue.resolveActive(answer);
  }
  ui.setStatus(statusKey, undefined);
  return queue.getAnswerRecords();
}
