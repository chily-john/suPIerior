import type { QuestionAnswer } from "./question-definition";

export interface AnswerRecord<TAnswer extends QuestionAnswer = QuestionAnswer> {
  questionId: string;
  prompt: string;
  answer: TAnswer;
  summary: string;
  recordInContext: boolean;
}
