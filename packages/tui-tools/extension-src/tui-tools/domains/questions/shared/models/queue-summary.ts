import type { AnswerRecord } from "./answer-record";
import type { QuestionDefinition } from "./question-definition";

export interface QueueProgress {
  phase: string;
  currentIndex: number;
  total: number;
  adjustment: number;
  statusText: string;
}

export interface QueueSummary {
  phase: string;
  active?: Pick<QuestionDefinition, "id" | "kind" | "prompt">;
  queued: Array<Pick<QuestionDefinition, "id" | "kind" | "prompt">>;
  answers: Array<Pick<AnswerRecord, "questionId" | "summary">>;
  progress: QueueProgress;
}
