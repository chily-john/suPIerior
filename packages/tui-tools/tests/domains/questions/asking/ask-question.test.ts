import { describe, expect, it } from "vitest";
import {
  askQuestion,
  beginQuestionLoading,
  type PiQuestionUi,
  type PiWidgetFactory,
} from "../../../../extension-src/tui-tools/domains/questions/features/asking";

describe("askQuestion", () => {
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
  it("clears the editor, renders prior context with a loading widget, and consumes terminal input until stopped", () => {
    let handler: ((data: string) => { consume?: boolean } | undefined) | undefined;
    const calls: string[] = [];
    const widgets: Array<PiWidgetFactory | string[] | undefined> = [];
    const ui: PiQuestionUi = {
      input: async () => undefined,
      select: async () => undefined,
      confirm: async () => true,
      setStatus: () => undefined,
      setEditorText: (text) => calls.push(`text:${text}`),
      setWidget: (_key, content) => widgets.push(content),
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
    const widget = typeof widgets[0] === "function" ? widgets[0]({ requestRender: () => undefined }, {}) : undefined;
    expect(widget?.render(80)).toEqual([
      "What should we build?",
      "",
      "Answer: A better loader",
      "",
      "",
      "⠋ Thinking…",
    ]);
    widget?.dispose?.();

    stop();

    expect(handler).toBeUndefined();
    expect(widgets.at(-1)).toBeUndefined();
  });

  it("falls back to Pi working state when extension widgets are unavailable", () => {
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
