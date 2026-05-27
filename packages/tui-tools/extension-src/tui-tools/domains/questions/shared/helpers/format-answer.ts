import type { QuestionAnswer } from "../models/question-definition";

export function formatAnswer(answer: QuestionAnswer): string {
  if (Array.isArray(answer)) return answer.join(", ");
  return typeof answer === "boolean" ? (answer ? "yes" : "no") : answer;
}
