import { describe, expect, it } from "vitest";
import { createQuestionUiHarness } from "./question-ui-harness";

describe("createQuestionUiHarness", () => {
  it("records question UI lifecycle events in call order with readable timeline output", () => {
    const harness = createQuestionUiHarness();

    harness.ui.setStatus("question-session-help", "Explain the answer");
    harness.ui.setEditorText?.("draft answer");
    harness.ui.setWidget?.("question-session-question", ["What should we build?"], {
      placement: "aboveEditor",
    });
    const unsubscribe = harness.ui.onTerminalInput?.(() => ({ consume: true }));
    const result = harness.enter();
    unsubscribe?.();
    harness.ui.setWidget?.("question-session-question", undefined);

    expect(result).toEqual({ consume: true });
    expect(harness.events()).toEqual([
      "setStatus question-session-help=Explain the answer",
      "setEditorText draft answer",
      "setWidget question-session-question aboveEditor lines:What should we build?",
      "onTerminalInput subscribe",
      "terminalInput \\r consume=true",
      "onTerminalInput unsubscribe",
      "setWidget question-session-question cleared",
    ]);
    expect(harness.timelineText()).toContain(
      "1. setStatus question-session-help=Explain the answer\n2. setEditorText draft answer\n3. setWidget question-session-question aboveEditor lines:What should we build?",
    );
  });

  it("renders a readable screen preview and omits cleared sections", () => {
    const harness = createQuestionUiHarness({ editorText: "draft answer" });

    harness.ui.setWidget?.("question-session-question", ["What should we build?"], {
      placement: "aboveEditor",
    });
    harness.ui.setStatus("question-session-help", "Explain the answer");

    expect(harness.renderWidget("question-session-question", 80)).toEqual(["What should we build?"]);
    expect(harness.renderWidget("missing-widget", 80)).toEqual([]);
    expect(harness.screen(80)).toBe(
      [
        "Above editor:",
        "What should we build?",
        "",
        "Editor:",
        "draft answer",
        "",
        "Status:",
        "question-session-help: Explain the answer",
      ].join("\n"),
    );

    harness.ui.setWidget?.("question-session-question", undefined);
    harness.ui.setEditorText?.("");
    harness.ui.setStatus("question-session-help", undefined);

    expect(harness.screen(80)).toBe("");
  });

  it("clears recorded events without resetting editor text", () => {
    const harness = createQuestionUiHarness({ editorText: "kept" });

    harness.ui.setStatus("question-session-help", "Helpful text");
    harness.clearEvents();

    expect(harness.events()).toEqual([]);
    expect(harness.ui.getEditorText?.()).toBe("kept");
  });
});
