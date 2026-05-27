import { createAnswerRecord } from "@/domains/questions/shared/helpers/create-answer-record";
import { pickQuestion } from "@/domains/questions/shared/helpers/pick-question";
import { validateAnswer } from "@/domains/questions/shared/helpers/validate-answer";
import type { AnswerRecord } from "@/domains/questions/shared/models/answer-record";
import type {
  QuestionAnswer,
  QuestionDefinition,
} from "@/domains/questions/shared/models/question-definition";
import type { QueueProgress, QueueSummary } from "@/domains/questions/shared/models/queue-summary";
import type { QuestionQueueOptions } from "./models/question-queue-options";

export class QuestionQueue {
  private readonly answers: AnswerRecord[] = [];
  private lastQuestionArrayLength: number;
  private questionArrayDelta = 0;
  private questions: QuestionDefinition[];
  private phase: string;
  private showAdjustmentIndicator: boolean;

  constructor(questions: QuestionDefinition[], options: QuestionQueueOptions) {
    this.questions = [...questions];
    this.lastQuestionArrayLength = questions.length;
    this.phase = options.phase;
    this.showAdjustmentIndicator = options.showAdjustmentIndicator ?? true;
  }

  get length(): number {
    return this.questions.length;
  }

  get completed(): number {
    return this.answers.length;
  }

  get active(): QuestionDefinition | undefined {
    return this.questions[0];
  }

  getAnswerRecords(): AnswerRecord[] {
    return [...this.answers];
  }

  setPhase(phase: string): void {
    this.phase = phase;
  }

  add(question: QuestionDefinition, index = this.questions.length): void {
    this.ensureUnique(question.id);
    const safeIndex = Math.max(0, Math.min(index, this.questions.length));
    this.questions.splice(safeIndex, 0, question);
    this.questionArrayDelta += 1;
  }

  remove(id: string): QuestionDefinition | undefined {
    const index = this.questions.findIndex((question) => question.id === id);
    if (index < 0) return undefined;
    return this.questions.splice(index, 1)[0];
  }

  rebase(questions: QuestionDefinition[]): void {
    this.questionArrayDelta = questions.length - this.lastQuestionArrayLength;
    this.lastQuestionArrayLength = questions.length;
    const seen = new Set(this.answers.map((answer) => answer.questionId));
    this.questions = [];
    for (const question of questions) {
      if (seen.has(question.id)) continue;
      this.ensureUnique(question.id);
      this.questions.push(question);
    }
  }

  async resolveActive(answer: QuestionAnswer): Promise<AnswerRecord> {
    const question = this.active;
    if (!question) throw new Error("No active question to resolve.");
    await validateAnswer(question, answer);
    const record = createAnswerRecord(question, answer);
    this.questions.shift();
    this.answers.push(record);
    return record;
  }

  getProgress(): QueueProgress {
    const total = this.completed + this.questions.length;
    const currentIndex = this.questions.length === 0 ? this.completed : this.completed + 1;
    const adjustment = this.questionArrayDelta;
    const suffix =
      this.showAdjustmentIndicator && adjustment !== 0
        ? ` ${adjustment > 0 ? "+" : ""}${adjustment}`
        : "";
    return {
      phase: this.phase,
      currentIndex,
      total,
      adjustment,
      statusText: `[Feature: ${this.phase}] Question ${currentIndex} of ${total}${suffix}`,
    };
  }

  getSummary(): QueueSummary {
    const active = this.active;
    return {
      phase: this.phase,
      active: active ? pickQuestion(active) : undefined,
      queued: this.questions.slice(active ? 1 : 0).map(pickQuestion),
      answers: this.answers.map((answer) => ({
        questionId: answer.questionId,
        summary: answer.summary,
      })),
      progress: this.getProgress(),
    };
  }

  private ensureUnique(id: string): void {
    if (
      this.questions.some((question) => question.id === id) ||
      this.answers.some((answer) => answer.questionId === id)
    ) {
      throw new Error(`Question id already exists: ${id}`);
    }
  }
}
