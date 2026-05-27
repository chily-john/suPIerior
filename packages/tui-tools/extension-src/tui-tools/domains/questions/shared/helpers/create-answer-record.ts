import type { AnswerRecord } from "../models/answer-record";
import type { QuestionAnswer, QuestionDefinition } from "../models/question-definition";
import { formatAnswer } from "./format-answer";

export function createAnswerRecord(
  question: QuestionDefinition,
  answer: QuestionAnswer,
): AnswerRecord {
  return {
    questionId: question.id,
    prompt: question.prompt,
    answer,
    summary:
      question.summarize?.(answer as never, question as never) ??
      `${question.prompt}: ${formatAnswer(answer)}`,
    recordInContext: question.recordInContext ?? true,
  };
}
