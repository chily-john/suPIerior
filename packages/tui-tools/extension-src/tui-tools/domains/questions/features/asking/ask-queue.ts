import type { QuestionQueue } from "@/domains/questions/features/queue";
import type { AnswerRecord } from "@/domains/questions/shared/models/answer-record";
import { askQuestion, beginQuestionLoading } from "./ask-question";
import type { AskQueueOptions } from "./models/ask-queue-options";
import type { PiQuestionUi } from "./models/pi-question-ui";

export async function askQueue(
  ui: PiQuestionUi,
  queue: QuestionQueue,
  options: AskQueueOptions = {},
): Promise<AnswerRecord[]> {
  const statusKey = options.statusKey ?? "feature-flow";
  while (queue.active) {
    const question = queue.active;
    ui.setStatus(statusKey, queue.getProgress().statusText);
    const answer = await askQuestion(ui, question);
    const stopLoading = beginQuestionLoading(ui, { question, answer });
    try {
      await queue.resolveActive(answer);
    } finally {
      stopLoading();
    }
  }
  ui.setStatus(statusKey, undefined);
  return queue.getAnswerRecords();
}
