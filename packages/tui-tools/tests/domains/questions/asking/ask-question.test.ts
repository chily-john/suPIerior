import { describe, expect, it } from "vitest";
import {
  askQuestion,
  beginQuestionLoading,
  type PiQuestionUi,
  type PiWidgetFactory,
} from "../../../../extension-src/tui-tools/domains/questions/features/asking";
import { createQuestionUiHarness } from "../../../support";

describe("askQuestion", () => {
  it("renders and submits a text question through the reusable question UI harness", async () => {
    const harness = createQuestionUiHarness();

    const answerPromise = askQuestion(harness.ui, {
      id: "q1",
      kind: "text",
      prompt: "What should we build?",
    });
    harness.ui.setEditorText?.("A reusable harness");
    expect(harness.enter()).toEqual({ consume: true });
    const answer = await answerPromise;

    expect(answer).toBe("A reusable harness");
    expect(harness.events()).toEqual([
      "setWidget feature-flow-question aboveEditor widget:What should we build?",
      "setEditorText ",
      "onTerminalInput subscribe",
      "setEditorText A reusable harness",
      "getEditorText A reusable harness",
      "onTerminalInput unsubscribe",
      "setEditorText ",
      "terminalInput \\r consume=true",
      "setWidget feature-flow-question cleared",
      "setStatus feature-flow-help=cleared",
    ]);
    expect(harness.timelineText()).toContain(
      "1. setWidget feature-flow-question aboveEditor widget:What should we build?\n2. setEditorText ",
    );
  });

  it("renders formatted text questions in an untruncated custom widget and uses the main editor without extension titles", async () => {
    const widgets: Array<string[] | PiWidgetFactory | undefined> = [];
    let editorText = "answer";
    let handler: ((data: string) => { consume?: boolean } | undefined) | undefined;
    const ui: PiQuestionUi = {
      input: async () => "fallback",
      editor: async () => "extension editor should not be used",
      select: async () => undefined,
      confirm: async () => true,
      setStatus: () => undefined,
      setEditorText: (text) => {
        editorText = text || "answer";
      },
      getEditorText: () => editorText,
      onTerminalInput: (nextHandler) => {
        handler = nextHandler;
        return () => {
          handler = undefined;
        };
      },
      setWidget: (_key, content) => widgets.push(content),
    };

    const answerPromise = askQuestion(ui, {
      id: "q1",
      kind: "text",
      prompt: "First line\n\n1. Keep numbering\n   - and indentation",
    });
    expect(handler?.("\r")).toEqual({ consume: true });
    const answer = await answerPromise;

    expect(answer).toBe("answer");
    expect(typeof widgets[0]).toBe("function");
    const widget = typeof widgets[0] === "function" ? widgets[0]({}, {}) : undefined;
    expect(widget?.render(80)).toEqual([
      "First line",
      "",
      "1. Keep numbering",
      "   - and indentation",
    ]);
    expect(widgets.at(-1)).toBeUndefined();
  });
});

describe("beginQuestionLoading", () => {
  it("exposes active loading lifecycle through the harness timeline and screen preview", () => {
    const harness = createQuestionUiHarness({ editorText: "stale draft" });

    const stop = beginQuestionLoading(harness.ui, {
      question: { id: "q1", kind: "text", prompt: "What should we build?" },
      answer: "A better loader",
      message: "Loading next question…",
    });

    expect(harness.events()).toEqual([
      "setEditorText ",
      "setWidget feature-flow-question aboveEditor widget:What should we build? |  | Answer: A better loader",
      "working:indicator",
      "working:message Loading next question…",
      "working:visible true",
      "onTerminalInput subscribe",
    ]);
    expect(harness.timelineText()).toContain(
      [
        "3. working:indicator",
        "4. working:message Loading next question…",
        "5. working:visible true",
      ].join("\n"),
    );
    expect(harness.screen(80)).toContain("Working:\nLoading next question…");
    expect(harness.screen(80)).toContain(
      "Above editor:\nWhat should we build?\n\nAnswer: A better loader",
    );
    expect(harness.input("typed")).toEqual({ consume: true });

    stop();
    expect(harness.input("typed-after-stop")).toEqual({ consume: false });

    expect(harness.events().slice(-7)).toEqual([
      "terminalInput typed consume=true",
      "onTerminalInput unsubscribe",
      "setWidget feature-flow-question cleared",
      "working:visible false",
      "working:message default",
      "working:indicator",
      "terminalInput typed-after-stop consume=false",
    ]);
    expect(harness.timelineText()).toContain("10. working:visible false");
    expect(harness.screen(80)).toBe("");
  });

  it("clears the editor, renders prior context, starts Pi working state, and consumes terminal input until stopped", () => {
    let handler: ((data: string) => { consume?: boolean } | undefined) | undefined;
    const calls: string[] = [];
    const working: string[] = [];
    const widgets: Array<PiWidgetFactory | string[] | undefined> = [];
    const ui: PiQuestionUi = {
      input: async () => undefined,
      select: async () => undefined,
      confirm: async () => true,
      setStatus: () => undefined,
      setEditorText: (text) => calls.push(`text:${text}`),
      setWidget: (_key, content) => widgets.push(content),
      setWorkingIndicator: () => working.push("indicator"),
      setWorkingMessage: (message) => working.push(`message:${message ?? "default"}`),
      setWorkingVisible: (visible) => working.push(`visible:${visible}`),
      onTerminalInput: (nextHandler) => {
        handler = nextHandler;
        return () => {
          handler = undefined;
        };
      },
    };

    const stop = beginQuestionLoading(ui, {
      question: { id: "q1", kind: "text", prompt: "What should we build?" },
      answer: "A better loader",
    });

    expect(calls).toEqual(["text:"]);
    expect(handler?.("typed")).toEqual({ consume: true });
    expect(typeof widgets[0]).toBe("function");
    const widget =
      typeof widgets[0] === "function"
        ? widgets[0]({ requestRender: () => undefined }, {})
        : undefined;
    expect(widget?.render(80)).toEqual(["What should we build?", "", "Answer: A better loader"]);
    expect(working).toEqual(["indicator", "message:Thinking…", "visible:true"]);

    stop();

    expect(handler).toBeUndefined();
    expect(widgets.at(-1)).toBeUndefined();
    expect(working.slice(-3)).toEqual(["visible:false", "message:default", "indicator"]);
  });

  it("wraps submitted answer context to the widget width", () => {
    const widgets: Array<PiWidgetFactory | string[] | undefined> = [];
    const ui: PiQuestionUi = {
      input: async () => undefined,
      select: async () => undefined,
      confirm: async () => true,
      setStatus: () => undefined,
      setWidget: (_key, content) => widgets.push(content),
    };

    beginQuestionLoading(ui, {
      question: "Question?",
      answer: "This answer is long enough to wrap safely in a narrow terminal.",
    });

    const widget = typeof widgets[0] === "function" ? widgets[0]({}, {}) : undefined;
    const rendered = widget?.render(37) ?? [];

    expect(rendered).toEqual([
      "Question?",
      "",
      "Answer: This answer is long enough",
      "to wrap safely in a narrow",
      "terminal.",
    ]);
    expect(rendered.every((line) => line.length <= 37)).toBe(true);
  });

  it("uses Pi working state when extension widgets are unavailable", () => {
    let handler: ((data: string) => { consume?: boolean } | undefined) | undefined;
    const calls: string[] = [];
    const ui: PiQuestionUi = {
      input: async () => undefined,
      select: async () => undefined,
      confirm: async () => true,
      setStatus: () => undefined,
      setEditorText: (text) => calls.push(`text:${text}`),
      setWorkingMessage: (message) => calls.push(`message:${message ?? "default"}`),
      setWorkingVisible: (visible) => calls.push(`visible:${visible}`),
      setWorkingIndicator: () => calls.push("indicator"),
      onTerminalInput: (nextHandler) => {
        handler = nextHandler;
        return () => {
          handler = undefined;
        };
      },
    };

    const stop = beginQuestionLoading(ui);

    expect(calls).toEqual(["text:", "indicator", "message:Thinking…", "visible:true"]);
    expect(handler?.("typed")).toEqual({ consume: true });

    stop();

    expect(handler).toBeUndefined();
    expect(calls.slice(-3)).toEqual(["visible:false", "message:default", "indicator"]);
  });
});
