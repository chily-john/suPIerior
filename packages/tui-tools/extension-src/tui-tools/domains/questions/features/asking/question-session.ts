import { createAnswerRecord } from "@/domains/questions/shared/helpers/create-answer-record";
import type { AnswerRecord } from "@/domains/questions/shared/models/answer-record";
import type { QuestionDefinition } from "@/domains/questions/shared/models/question-definition";
import { askQuestion, beginQuestionLoading } from "./ask-question";
import type { PiQuestionUi } from "./models/pi-question-ui";

const defaultWidgetKey = "feature-flow-question";
const defaultLoadingMessage = "Thinking…";

export interface QuestionSessionOptions {
  phase: string;
  statusKey?: string;
  loadingMessage?: string;
  showAdjustmentIndicator?: boolean;
  widgetKey?: string;
}

export interface QuestionSessionAskOptions {
  estimatedRemaining?: number;
  loadingMessage?: string;
}

export interface QuestionSession {
  ask(question: QuestionDefinition, options?: QuestionSessionAskOptions): Promise<AnswerRecord>;
  setLoading(message?: string): void;
  dispose(): void;
}

export function createQuestionSession(
  ui: PiQuestionUi,
  options: QuestionSessionOptions,
): QuestionSession {
  const session = new DefaultQuestionSession(ui, options);
  session.setLoading(options.loadingMessage);
  return session;
}

class DefaultQuestionSession implements QuestionSession {
  private disposed = false;
  private loadingCleanup: (() => void) | undefined;
  private loadingMessage: string;
  private submittedContext:
    | {
        question: QuestionDefinition;
        answer: AnswerRecord["answer"];
      }
    | undefined;

  constructor(
    private readonly ui: PiQuestionUi,
    private readonly options: QuestionSessionOptions,
  ) {
    this.loadingMessage = options.loadingMessage ?? defaultLoadingMessage;
  }

  async ask(
    question: QuestionDefinition,
    options: QuestionSessionAskOptions = {},
  ): Promise<AnswerRecord> {
    this.ensureActive();
    if (options.loadingMessage !== undefined) this.loadingMessage = options.loadingMessage;
    this.stopLoading();
    this.submittedContext = undefined;
    this.setStatus(formatStatus(this.options.phase, options.estimatedRemaining));

    const answer = await askQuestion(this.ui, question, {
      statusKey: "feature-flow-help",
      widgetKey: this.widgetKey,
    });
    const record = createAnswerRecord(question, answer);
    this.submittedContext = { question, answer };
    this.startLoading();
    return record;
  }

  setLoading(message?: string): void {
    this.ensureActive();
    if (message !== undefined) this.loadingMessage = message;
    this.stopLoading();
    this.startLoading();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLoading();
    this.clearStatus();
  }

  private startLoading(): void {
    this.setStatus(this.options.phase);
    this.loadingCleanup = beginQuestionLoading(this.ui, {
      message: this.loadingMessage,
      question: this.submittedContext?.question,
      answer: this.submittedContext?.answer,
      widgetKey: this.widgetKey,
    });
  }

  private stopLoading(): void {
    this.loadingCleanup?.();
    this.loadingCleanup = undefined;
  }

  private setStatus(value: string): void {
    if (!this.options.statusKey) return;
    this.ui.setStatus(this.options.statusKey, value);
  }

  private clearStatus(): void {
    if (!this.options.statusKey) return;
    this.ui.setStatus(this.options.statusKey, undefined);
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error("QuestionSession has been disposed.");
  }

  private get widgetKey(): string {
    return this.options.widgetKey ?? defaultWidgetKey;
  }
}

function formatStatus(phase: string, estimatedRemaining: number | undefined): string {
  if (estimatedRemaining === undefined) return phase;
  return `${phase} · ${estimatedRemaining} remaining`;
}
