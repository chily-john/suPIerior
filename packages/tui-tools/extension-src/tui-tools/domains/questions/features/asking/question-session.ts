import { createAnswerRecord } from "@/domains/questions/shared/helpers/create-answer-record";
import type { AnswerRecord } from "@/domains/questions/shared/models/answer-record";
import type { QuestionDefinition } from "@/domains/questions/shared/models/question-definition";
import { promptForQuestion, startSessionLoading } from "./question-session-ui";
import type { PiQuestionUi } from "./models/pi-question-ui";

const defaultWidgetKey = "question-session-question";
const defaultLoadingMessage = "Thinking…";

export interface QuestionSessionOptions {
  loadingMessage?: string;
  widgetKey?: string;
}

export interface QuestionSessionAskOptions {
  loadingMessage?: string;
}

export interface QuestionSession {
  ask(question: QuestionDefinition, options?: QuestionSessionAskOptions): Promise<AnswerRecord>;
  setLoadingMessage(message: string): void;
  dispose(): void;
}

export function createQuestionSession(
  ui: PiQuestionUi,
  options: QuestionSessionOptions = {},
): QuestionSession {
  const session = new DefaultQuestionSession(ui, options);
  session.setLoadingMessage(options.loadingMessage ?? defaultLoadingMessage);
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
    const answer = await promptForQuestion(this.ui, question, {
      widgetKey: this.widgetKey,
    });
    const record = createAnswerRecord(question, answer);
    this.submittedContext = { question, answer };
    this.startLoading();
    return record;
  }

  setLoadingMessage(message: string): void {
    this.ensureActive();
    this.loadingMessage = message;
    this.stopLoading();
    this.startLoading();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLoading();
  }

  private startLoading(): void {
    this.loadingCleanup = startSessionLoading(this.ui, {
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

  private ensureActive(): void {
    if (this.disposed) throw new Error("QuestionSession has been disposed.");
  }

  private get widgetKey(): string {
    return this.options.widgetKey ?? defaultWidgetKey;
  }
}
