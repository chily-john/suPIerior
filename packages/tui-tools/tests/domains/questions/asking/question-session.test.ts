import { describe, expect, it } from "vitest";
import {
  createQuestionSession,
  type QuestionDefinition,
} from "../../../../extension-src/tui-tools/domains/questions";
import { createQuestionUiHarness } from "../../../support";

const textQuestion = (id: string, prompt: string, helpText?: string): QuestionDefinition => ({
  id,
  kind: "text",
  prompt,
  helpText,
});

describe("createQuestionSession", () => {
  it("starts in loading immediately and locks input until a question is asked", () => {
    const harness = createQuestionUiHarness({ editorText: "stale draft" });

    const session = createQuestionSession(harness.ui, {
      loadingMessage: "Analyzing discovery…",
    });

    expect(harness.input("typed while loading")).toEqual({ consume: true });
    expect(harness.screen(80)).toContain("Working:\nAnalyzing discovery…");
    expect(harness.events()).toEqual([
      "setEditorText ",
      "working:indicator",
      "working:message Analyzing discovery…",
      "working:visible true",
      "onTerminalInput subscribe",
      "terminalInput typed while loading consume=true",
    ]);

    session.dispose();
  });

  it("asks a question and restores loading before resolving", async () => {
    const harness = createQuestionUiHarness();
    const session = createQuestionSession(harness.ui, {
      loadingMessage: "Analyzing next step…",
    });

    const answerPromise = session.ask(textQuestion("goal", "What should we build?"));
    expect(harness.input("blocked?"), harness.timelineText()).toEqual({ consume: false });
    expect(harness.screen(80)).toContain("Above editor:\nWhat should we build?");
    expect(harness.screen(80)).not.toContain("Working:");

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

  it("updates the baseline loading message without requiring callers to start loading", async () => {
    const harness = createQuestionUiHarness();
    const session = createQuestionSession(harness.ui, {
      loadingMessage: "Initial loading…",
    });

    session.setLoadingMessage("Custom follow-up loading…");
    expect(harness.screen(80)).toContain("Working:\nCustom follow-up loading…");

    const answerPromise = session.ask(textQuestion("second", "Second question?"), {
      loadingMessage: "Loading after second…",
    });
    expect(harness.screen(80)).toContain("Second question?");
    expect(harness.screen(80)).not.toContain("Working:");

    harness.ui.setEditorText?.("Second answer");
    expect(harness.enter()).toEqual({ consume: true });
    await answerPromise;
    expect(harness.screen(80)).toContain("Second question?\n\nAnswer: Second answer");
    expect(harness.screen(80)).toContain("Working:\nLoading after second…");

    session.dispose();
  });

  it("wraps prompt and submitted-answer context through the session interface", async () => {
    const harness = createQuestionUiHarness();
    const session = createQuestionSession(harness.ui, {
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

    session.dispose();
  });

  it("disposes by clearing only its widget/working state and unlocking input", () => {
    const harness = createQuestionUiHarness();
    const session = createQuestionSession(harness.ui, {
      loadingMessage: "Analyzing discovery…",
    });
    harness.clearEvents();

    session.dispose();

    expect(harness.events()).toEqual([
      "onTerminalInput unsubscribe",
      "setWidget question-session-question cleared",
      "working:visible false",
      "working:message default",
      "working:indicator",
    ]);
    expect(harness.screen(80)).toBe("");
    expect(harness.input("after dispose")).toEqual({ consume: false });
  });
});

function renderedLinesMessage(lines: string[], width: number): string {
  return [
    `Expected rendered widget lines to fit width ${width}.`,
    ...lines.map((line) => `${line.length.toString().padStart(2, " ")}: ${line}`),
  ].join("\n");
}
