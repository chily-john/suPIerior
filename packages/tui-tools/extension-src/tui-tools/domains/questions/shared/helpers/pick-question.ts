import type { QuestionDefinition } from "../models/question-definition";

export function pickQuestion(
  question: QuestionDefinition,
): Pick<QuestionDefinition, "id" | "kind" | "prompt"> {
  return { id: question.id, kind: question.kind, prompt: question.prompt };
}
