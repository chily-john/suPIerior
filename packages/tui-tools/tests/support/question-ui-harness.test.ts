import { describe, expect, it } from "vitest";
import { createQuestionUiHarness } from "./question-ui-harness";

describe("createQuestionUiHarness", () => {
  it("records question UI lifecycle events in call order with readable timeline output", () => {
    const harness = createQuestionUiHarness();

    harness.ui.setStatus("feature-flow-help", "Explain the answer");
    harness.ui.setEditorText?.("draft answer");
    harness.ui.setWidget?.("feature-flow-question", ["What should we build?"], {
      placement: "aboveEditor",
    });
    const unsubscribe = harness.ui.onTerminalInput?.(() => ({ consume: true }));
    const result = harness.enter();
    unsubscribe?.();
    harness.ui.setWidget?.("feature-flow-question", undefined);

    expect(result).toEqual({ consume: true });
    expect(harness.events()).toEqual([
      "setStatus feature-flow-help=Explain the answer",
      "setEditorText draft answer",
      "setWidget feature-flow-question aboveEditor lines:What should we build?",
      "onTerminalInput subscribe",
      "terminalInput \\r consume=true",
      "onTerminalInput unsubscribe",
      "setWidget feature-flow-question cleared",
    ]);
    expect(harness.timelineText()).toContain(
      "1. setStatus feature-flow-help=Explain the answer\n2. setEditorText draft answer\n3. setWidget feature-flow-question aboveEditor lines:What should we build?",
    );
  });

  it("renders a readable screen preview and omits cleared sections", () => {
    const harness = createQuestionUiHarness({ editorText: "draft answer" });

    harness.ui.setWidget?.("feature-flow-question", ["What should we build?"], {
      placement: "aboveEditor",
    });
    harness.ui.setStatus("feature-flow-help", "Explain the answer");

    expect(harness.renderWidget("feature-flow-question", 80)).toEqual(["What should we build?"]);
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
        "feature-flow-help: Explain the answer",
      ].join("\n"),
    );

    harness.ui.setWidget?.("feature-flow-question", undefined);
    harness.ui.setEditorText?.("");
    harness.ui.setStatus("feature-flow-help", undefined);

    expect(harness.screen(80)).toBe("");
  });

  it("clears recorded events without resetting editor text", () => {
    const harness = createQuestionUiHarness({ editorText: "kept" });

    harness.ui.setStatus("feature-flow-help", "Helpful text");
    harness.clearEvents();

    expect(harness.events()).toEqual([]);
    expect(harness.ui.getEditorText?.()).toBe("kept");
  });
});
