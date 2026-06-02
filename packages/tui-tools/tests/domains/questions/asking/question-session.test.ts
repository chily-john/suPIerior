import { describe, expect, it } from "vitest";
import * as asking from "../../../../extension-src/tui-tools/domains/questions/features/asking";
import type {
  AnswerRecord,
  QuestionDefinition,
} from "../../../../extension-src/tui-tools/domains/questions";
import type { PiQuestionUi } from "../../../../extension-src/tui-tools/domains/questions/features/asking";
import { createQuestionUiHarness } from "../../../support";

interface QuestionSessionOptions {
  phase: string;
  statusKey?: string;
  loadingMessage?: string;
  showAdjustmentIndicator?: boolean;
  widgetKey?: string;
}

interface QuestionSessionAskOptions {
  estimatedRemaining?: number;
  loadingMessage?: string;
}

interface QuestionSession {
  ask(question: QuestionDefinition, options?: QuestionSessionAskOptions): Promise<AnswerRecord>;
  setLoading(message?: string): void;
  dispose(): void;
}

type CreateQuestionSession = (ui: PiQuestionUi, options: QuestionSessionOptions) => QuestionSession;

const textQuestion = (id: string, prompt: string, helpText?: string): QuestionDefinition => ({
  id,
  kind: "text",
  prompt,
  helpText,
});

describe("createQuestionSession", () => {
  it("starts in loading immediately with Pi defaults, configured message, status progress, and locked input", () => {
    const harness = createQuestionUiHarness({ editorText: "stale draft" });

    const session = createSession(harness.ui, {
      phase: "Discovery",
      statusKey: "questions",
      loadingMessage: "Analyzing discovery…",
    });

    expect(harness.input("typed while loading")).toEqual({ consume: true });
    expect(harness.screen(80)).toContain("Working:\nAnalyzing discovery…");
    expect(harness.screen(80)).toContain("Status:\nquestions: Discovery");
    expect(harness.events()).toEqual([
      "setStatus questions=Discovery",
      "setEditorText ",
      "working:indicator",
      "working:message Analyzing discovery…",
      "working:visible true",
      "onTerminalInput subscribe",
      "terminalInput typed while loading consume=true",
    ]);

    session.dispose();
  });

  it("asks a question, returns an AnswerRecord, and restores submitted-answer loading before resolving", async () => {
    const harness = createQuestionUiHarness();
    const session = createSession(harness.ui, {
      phase: "Discovery",
      statusKey: "questions",
      loadingMessage: "Analyzing next step…",
    });

    const answerPromise = session.ask(textQuestion("goal", "What should we build?"), {
      estimatedRemaining: 2,
    });
    expect(harness.input("blocked?"), harness.timelineText()).toEqual({ consume: false });
    expect(harness.screen(80)).toContain("Above editor:\nWhat should we build?");
    expect(harness.screen(80)).not.toContain("Working:");
    expect(harness.screen(80)).toContain("Status:\nquestions: Discovery · 2 remaining");

    harness.ui.setEditorText?.("A persistent question session");
    expect(harness.enter()).toEqual({ consume: true });
    const answer = await answerPromise;

    expect(answer).toEqual({
      questionId: "goal",
      prompt: "What should we build?",
      answer: "A persistent question session",
      summary: "What should we build?: A persistent question session",
      recordInContext: true,
    });
    expect(harness.screen(80)).toContain(
      "Above editor:\nWhat should we build?\n\nAnswer: A persistent question session",
    );
    expect(harness.screen(80)).toContain("Working:\nAnalyzing next step…");
    expect(harness.input("post-answer input")).toEqual({ consume: true });
    expect(harness.events().slice(-5, -1)).toEqual([
      "working:indicator",
      "working:message Analyzing next step…",
      "working:visible true",
      "onTerminalInput subscribe",
    ]);

    session.dispose();
  });

  it("replaces submitted-answer context with the next question and updates loading messages", async () => {
    const harness = createQuestionUiHarness();
    const session = createSession(harness.ui, {
      phase: "Discovery",
      loadingMessage: "Initial loading…",
    });

    const firstAnswer = session.ask(textQuestion("first", "First question?"));
    harness.ui.setEditorText?.("First answer");
    expect(harness.enter()).toEqual({ consume: true });
    await firstAnswer;
    expect(harness.screen(80)).toContain("First question?\n\nAnswer: First answer");

    session.setLoading("Custom follow-up loading…");
    expect(harness.screen(80)).toContain("Working:\nCustom follow-up loading…");

    const secondAnswer = session.ask(textQuestion("second", "Second question?"), {
      loadingMessage: "Loading after second…",
    });
    expect(harness.screen(80)).toContain("Second question?");
    expect(harness.screen(80)).not.toContain("First answer");

    harness.ui.setEditorText?.("Second answer");
    expect(harness.enter()).toEqual({ consume: true });
    await secondAnswer;
    expect(harness.screen(80)).toContain("Second question?\n\nAnswer: Second answer");
    expect(harness.screen(80)).toContain("Working:\nLoading after second…");

    session.dispose();
  });

  it("wraps narrow question and submitted-answer context without leaking duplicate input handlers", async () => {
    const harness = createQuestionUiHarness();
    const session = createSession(harness.ui, {
      phase: "Discovery",
      widgetKey: "question-session",
      loadingMessage: "Analyzing discovery…",
    });

    const question = textQuestion(
      "narrow",
      "Summarize the customer onboarding blockers before proceeding",
      "Include owners, dates, and risks",
    );
    const answerPromise = session.ask(question);
    expect(
      harness.renderWidget("question-session", 32),
      renderedLinesMessage(harness.renderWidget("question-session", 32), 32),
    ).toEqual([
      "Summarize the customer",
      "onboarding blockers before",
      "proceeding",
      "",
      "Help: Include owners, dates,",
      "and risks",
    ]);

    harness.ui.setEditorText?.("Owners are blocked by missing contracts and onboarding dates");
    expect(harness.enter()).toEqual({ consume: true });
    await answerPromise;

    const submittedContext = harness.renderWidget("question-session", 32);
    expect(submittedContext, renderedLinesMessage(submittedContext, 32)).toEqual([
      "Summarize the customer",
      "onboarding blockers before",
      "proceeding",
      "",
      "Answer: Owners are blocked by",
      "missing contracts and",
      "onboarding dates",
    ]);
    expect(
      submittedContext.every((line) => line.length <= 32),
      renderedLinesMessage(submittedContext, 32),
    ).toBe(true);

    const askAgain = session.ask(textQuestion("again", "Ask again?"));
    harness.ui.setEditorText?.("Again");
    expect(harness.enter()).toEqual({ consume: true });
    await askAgain;
    session.dispose();

    const events = harness.events();
    expect(events.filter((event) => event === "onTerminalInput subscribe")).toHaveLength(5);
    expect(events.filter((event) => event === "onTerminalInput unsubscribe")).toHaveLength(5);
    expect(harness.input("after dispose")).toEqual({ consume: false });
  });

  it("disposes by clearing widgets/status/working defaults and unlocking input", () => {
    const harness = createQuestionUiHarness();
    const session = createSession(harness.ui, {
      phase: "Discovery",
      statusKey: "questions",
      loadingMessage: "Analyzing discovery…",
    });
    harness.clearEvents();

    session.dispose();

    expect(harness.events()).toEqual([
      "onTerminalInput unsubscribe",
      "setWidget feature-flow-question cleared",
      "working:visible false",
      "working:message default",
      "working:indicator",
      "setStatus questions=cleared",
    ]);
    expect(harness.screen(80)).toBe("");
    expect(harness.input("after dispose")).toEqual({ consume: false });
  });
});

function createSession(ui: PiQuestionUi, options: QuestionSessionOptions): QuestionSession {
  expect(typeof (asking as { createQuestionSession?: unknown }).createQuestionSession).toBe(
    "function",
  );
  return (asking as { createQuestionSession: CreateQuestionSession }).createQuestionSession(
    ui,
    options,
  );
}

function renderedLinesMessage(lines: string[], width: number): string {
  return [
    `Expected rendered widget lines to fit width ${width}.`,
    ...lines.map((line) => `${line.length.toString().padStart(2, " ")}: ${line}`),
  ].join("\n");
}
