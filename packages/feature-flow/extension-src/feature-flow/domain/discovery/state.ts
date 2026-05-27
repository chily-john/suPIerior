import type { AnswerRecord, QuestionDefinition } from "@supierior/tui-tools";
import type { DiscoveryAnswer, DiscoveryQuestion, DiscoveryState } from "@domain/model";

export function createInitialDiscoveryState(description: string, slug: string): DiscoveryState {
  return { description, slug, answers: [], turns: 0 };
}

export function toQuestionDefinition(question: DiscoveryQuestion): QuestionDefinition {
  return {
    id: question.id,
    kind: "text",
    prompt: question.text,
    recordInContext: true,
  };
}

export function toDiscoveryAnswer(record: AnswerRecord): DiscoveryAnswer {
  return {
    questionId: record.questionId,
    questionText: record.prompt,
    answer: String(record.answer),
  };
}
