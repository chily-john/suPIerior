import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { mergeConfig } from "../extension-src/feature-flow/domain/config";
import { parseDiscoveryModelResponse } from "../extension-src/feature-flow/domain/discovery/parse-response";
import {
  createInitialFeatureFlowState,
  isFeatureFlowProcessing,
  transitionFeatureFlowState,
} from "../extension-src/feature-flow/domain/discovery/state";
import { resolveArtifactPaths } from "../extension-src/feature-flow/domain/paths";
import { proposeSlug, sanitizeSlug } from "../extension-src/feature-flow/domain/slug";
import { runDiscoveryLoop } from "../extension-src/feature-flow/app/discovery-loop";
import {
  runFeatureWorkflow,
  type FeatureWorkflowContext,
} from "../extension-src/feature-flow/app/workflow";

class MockAdapter {
  readonly prompts: string[] = [];
  constructor(private readonly responses: string[]) {}
  async complete(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    const response = this.responses.shift();
    if (response === undefined && prompt.includes("Generate the final feature handoff artifact")) {
      return "# Feature: generated\n\n## Problem Statement\n\nGenerated from discovery.";
    }
    if (response === undefined) throw new Error("No mock model response queued.");
    return response;
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for condition.");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("slug", () => {
  it("sanitizes unsafe path text", () => {
    expect(sanitizeSlug(" Hello, Feature!! ")).toBe("hello-feature");
    expect(proposeSlug("Add the thing for users and teams now please")).toBe(
      "add-the-thing-for-users-and-teams-now",
    );
  });
});

describe("config", () => {
  it("defaults dynamic question and model values", () => {
    const config = mergeConfig({ questions: { maxQuestions: 3 } as never });
    expect(config.questions.showAdjustmentIndicator).toBe(true);
    expect(config.questions.maxQuestions).toBe(3);
    expect(config.model).toEqual({ maxRepairAttempts: 2 });
  });
});

describe("paths", () => {
  it("uses nearest .pi root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    try {
      await mkdir(join(dir, ".pi"));
      await mkdir(join(dir, "a", "b"), { recursive: true });
      const paths = await resolveArtifactPaths(join(dir, "a", "b"), "demo");
      expect(paths.piRoot).toBe(join(dir, ".pi"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to cwd .pi when no project .pi exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    try {
      const paths = await resolveArtifactPaths(dir, "demo");
      expect(paths.piRoot).toBe(join(dir, ".pi"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("feature flow state", () => {
  it("distinguishes input-ready, busy, rendering, and complete phases", () => {
    const initial = createInitialFeatureFlowState();
    expect(initial.phase).toBe("input-ready");
    expect(isFeatureFlowProcessing(initial)).toBe(false);

    const busy = transitionFeatureFlowState(initial, "busy", "Processing");
    expect(busy).toMatchObject({ phase: "busy", isProcessing: true });

    const rendering = transitionFeatureFlowState(busy, "rendering", "Rendering");
    expect(rendering).toMatchObject({ phase: "rendering", isProcessing: true });

    const ready = transitionFeatureFlowState(rendering, "input-ready", "Waiting");
    expect(ready).toMatchObject({ phase: "input-ready", isProcessing: false });

    const complete = transitionFeatureFlowState(ready, "complete");
    expect(complete).toMatchObject({ phase: "complete", isProcessing: false });
  });
});

describe("discovery parsing", () => {
  it("parses fenced JSON responses", () => {
    expect(
      parseDiscoveryModelResponse(
        '```json\n{"readyToGenerate":false,"questions":[{"id":"q1","text":"Why?"}]}\n```',
      ).questions[0]?.id,
    ).toBe("q1");
  });

  it("rejects malformed responses", () => {
    expect(() => parseDiscoveryModelResponse("not json")).toThrow(/valid JSON/);
  });
});

describe("workflow", () => {
  it("writes final artifacts and removes draft", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const inputs = ["It should help users plan work."];
    const adapter = new MockAdapter([
      JSON.stringify({
        readyToGenerate: false,
        questions: [{ id: "q1", text: "What problem should this solve?" }],
      }),
      JSON.stringify({ message: "Ready to generate.", readyToGenerate: true, questions: [] }),
    ]);
    const ctx = createContext(dir, inputs, adapter);
    try {
      await mkdir(join(dir, ".pi"));
      const result = await runFeatureWorkflow("Build demo", ctx);
      expect(result?.slug).toBe("build-demo");
      const featurePath = join(dir, result!.featurePath);
      const planPath = join(dir, result!.planPath);
      await expect(readFile(featurePath, "utf8")).resolves.toContain("# Feature");
      await expect(readFile(planPath, "utf8")).resolves.toContain("# Plan");
      await expect(readFile(join(featurePath, "..", "feature.draft.md"), "utf8")).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("offers custom feature templates before generating the feature document", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const adapter = new MockAdapter([
      JSON.stringify({ readyToGenerate: true, questions: [] }),
      "# Custom Feature Document\n\nUsed the custom template.",
    ]);
    const selectedPrompts: string[] = [];
    const ctx = createContext(dir, [], adapter);
    ctx.ui.select = async (prompt, options) => {
      selectedPrompts.push(`${prompt}: ${options.join(",")}`);
      return "custom.md";
    };
    try {
      await mkdir(join(dir, ".pi", "feature-templates"), { recursive: true });
      await writeFile(
        join(dir, ".pi", "feature-templates", "custom.md"),
        "## Custom Section\n\nWrite a custom handoff.",
      );
      const result = await runFeatureWorkflow("Build demo", ctx);
      expect(selectedPrompts[0]).toContain("Default PRD-style handoff");
      expect(selectedPrompts[0]).toContain("custom.md");
      expect(adapter.prompts.at(-1)).toContain("## Custom Section");
      await expect(readFile(join(dir, result!.featurePath), "utf8")).resolves.toContain(
        "# Custom Feature Document",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("allows the model to evolve the backlog", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const asked: string[] = [];
    const adapter = new MockAdapter([
      JSON.stringify({
        readyToGenerate: false,
        questions: [
          { id: "q1", text: "First question" },
          { id: "q2", text: "Dropped question" },
        ],
      }),
      JSON.stringify({
        readyToGenerate: false,
        questions: [{ id: "q3", text: "Replacement question" }],
      }),
      JSON.stringify({ readyToGenerate: true, questions: [] }),
    ]);
    const ctx = createContext(dir, ["answer 1", "answer 3"], adapter, asked);
    try {
      await mkdir(join(dir, ".pi"));
      await runFeatureWorkflow("Build demo", ctx);
      expect(asked).toEqual(["First question", "Replacement question"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not re-ask answered IDs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const asked: string[] = [];
    const adapter = new MockAdapter([
      JSON.stringify({ readyToGenerate: false, questions: [{ id: "q1", text: "First" }] }),
      JSON.stringify({
        readyToGenerate: false,
        questions: [
          { id: "q1", text: "Duplicate" },
          { id: "q2", text: "Second" },
        ],
      }),
      JSON.stringify({ readyToGenerate: true, questions: [] }),
    ]);
    const ctx = createContext(dir, ["answer 1", "answer 2"], adapter, asked);
    try {
      await mkdir(join(dir, ".pi"));
      await runFeatureWorkflow("Build demo", ctx);
      expect(asked).toEqual(["First", "Second"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("repairs malformed model output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const adapter = new MockAdapter([
      "not json",
      JSON.stringify({ readyToGenerate: true, questions: [] }),
    ]);
    const ctx = createContext(dir, [], adapter);
    try {
      await mkdir(join(dir, ".pi"));
      await expect(runFeatureWorkflow("Build demo", ctx)).resolves.toBeDefined();
      expect(adapter.prompts[1]).toContain("Validation error");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("aborts cleanly after repair failure without final artifacts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const adapter = new MockAdapter(["bad", "still bad", "bad again"]);
    const ctx = createContext(dir, [], adapter);
    try {
      await mkdir(join(dir, ".pi"));
      await expect(runFeatureWorkflow("Build demo", ctx)).rejects.toThrow();
      await expect(
        readFile(join(dir, ".pi", "features", "build-demo", "feature.md"), "utf8"),
      ).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("includes configured budgets in prompts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const adapter = new MockAdapter([JSON.stringify({ readyToGenerate: true, questions: [] })]);
    const ctx = createContext(dir, [], adapter);
    try {
      await mkdir(join(dir, ".pi"));
      await mkdir(join(dir, ".pi", "features"), { recursive: true });
      await import("node:fs/promises").then(({ writeFile }) =>
        writeFile(
          join(dir, ".pi", "feature-flow.config.json"),
          JSON.stringify({ questions: { maxTurns: 4, maxQuestions: 6 } }),
        ),
      );
      await runFeatureWorkflow("Build demo", ctx);
      expect(adapter.prompts[0]).toContain("remaining turn budget");
      expect(adapter.prompts[0]).toContain("remaining question budget");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("shows the submitted answer in the default loading state until the next prompt is ready", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    let promptCount = 0;
    let workingVisible = false;
    let widgetRender: ((width: number) => string[]) | undefined;
    const adapter = {
      prompts: [] as string[],
      async complete(prompt: string): Promise<string> {
        this.prompts.push(prompt);
        promptCount += 1;
        if (promptCount === 1) {
          return JSON.stringify({
            readyToGenerate: false,
            questions: [{ id: "q1", text: "What problem should this solve?" }],
          });
        }
        if (promptCount === 2) {
          expect(workingVisible).toBe(true);
          expect(widgetRender?.(80)).toEqual([
            "What problem should this solve?",
            "",
            "Answer: It should help users plan work.",
          ]);
          return JSON.stringify({ readyToGenerate: true, questions: [] });
        }
        return "# Feature: generated\n";
      },
    };
    const ctx = createContext(dir, ["It should help users plan work."], adapter);
    ctx.ui.setWorkingVisible = (visible) => {
      workingVisible = visible;
    };
    ctx.ui.setWidget = (_key, content) => {
      if (typeof content !== "function") {
        widgetRender = undefined;
        return;
      }
      const widget = content({}, {});
      widgetRender = (width) => widget.render(width);
    };
    try {
      await mkdir(join(dir, ".pi"));
      await runFeatureWorkflow("Build demo", ctx);
      expect(workingVisible).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("publishes global busy state around processing and clears it when complete", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const adapter = new MockAdapter([JSON.stringify({ readyToGenerate: true, questions: [] })]);
    const states: Array<string | undefined> = [];
    const working: boolean[] = [];
    const ctx = createContext(dir, [], adapter);
    let currentState: string | undefined;
    let workingVisible = false;
    ctx.ui.setStatus = (key, value) => {
      if (key === "feature-flow-state") {
        currentState = value;
        states.push(value);
      }
    };
    ctx.ui.setWorkingVisible = (visible) => {
      workingVisible = visible;
      working.push(visible);
    };
    ctx.ui.notify = (message) => {
      if (message.startsWith("Feature artifacts written:")) {
        expect(currentState).toBe("Rendering final feature-flow output…");
        expect(workingVisible).toBe(true);
      }
    };
    try {
      await mkdir(join(dir, ".pi"));
      await runFeatureWorkflow("Build demo", ctx);
      expect(states).toContain("Resolving feature-flow configuration…");
      expect(states).toContain("Rendering final feature-flow output…");
      expect(states).toContain(undefined);
      expect(working).toContain(true);
      expect(working.at(-1)).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps loading visible and input unavailable after answer submission until the next question is ready", async () => {
    let completeCount = 0;
    let editorText = "";
    let terminalHandler: ((data: string) => { consume?: boolean } | undefined) | undefined;
    let currentWidget: ((width: number) => string[]) | undefined;
    let workingVisible = false;

    const adapter = {
      async complete(): Promise<string> {
        completeCount += 1;
        if (completeCount === 1) {
          return JSON.stringify({
            readyToGenerate: false,
            questions: [{ id: "q1", text: "First question" }],
          });
        }
        if (completeCount === 2) {
          expect(workingVisible).toBe(true);
          expect(terminalHandler?.("typed while loading")).toEqual({ consume: true });
          expect(currentWidget?.(80)).toEqual(["First question", "", "Answer: answer 1"]);
          return JSON.stringify({
            readyToGenerate: false,
            questions: [{ id: "q2", text: "Second question" }],
          });
        }
        return JSON.stringify({ readyToGenerate: true, questions: [] });
      },
    };
    const ctx = createContext(".", [], adapter);
    ctx.ui.setEditorText = (text) => {
      editorText = text;
    };
    ctx.ui.getEditorText = () => editorText;
    ctx.ui.onTerminalInput = (handler) => {
      terminalHandler = handler;
      return () => {
        if (terminalHandler === handler) terminalHandler = undefined;
      };
    };
    ctx.ui.setWorkingVisible = (visible) => {
      workingVisible = visible;
    };
    ctx.ui.setWidget = (_key, content) => {
      if (typeof content !== "function") {
        currentWidget = undefined;
        return;
      }
      const widget = content({}, {});
      currentWidget = (width) => widget.render(width);
    };

    const run = runDiscoveryLoop({
      description: "Build demo",
      slug: "build-demo",
      ctx,
      config: mergeConfig({}),
      modelAdapter: adapter,
    });

    await waitFor(() => currentWidget?.(80)[0] === "First question");
    editorText = "answer 1";
    expect(terminalHandler?.("\r")).toEqual({ consume: true });

    await waitFor(() => currentWidget?.(80)[0] === "Second question");
    expect(workingVisible).toBe(false);
    expect(terminalHandler?.("typed into ready input")).toBeUndefined();
    editorText = "answer 2";
    expect(terminalHandler?.("\r")).toEqual({ consume: true });

    await run;
    expect(workingVisible).toBe(false);
  });

  it("fails clearly when no Pi model adapter factory is provided", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const ctx = createContext(dir, []);
    try {
      await mkdir(join(dir, ".pi"));
      await expect(runFeatureWorkflow("Build demo", ctx)).rejects.toThrow(
        /requires Pi model integration/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

function createContext(
  dir: string,
  inputs: string[],
  discoveryModelAdapter?: FeatureWorkflowContext["discoveryModelAdapter"],
  asked: string[] = [],
): FeatureWorkflowContext {
  return {
    cwd: dir,
    discoveryModelAdapter,
    ui: {
      input: async (prompt, placeholder) => {
        asked.push(prompt || placeholder || "");
        return inputs.shift() ?? "";
      },
      select: async () => undefined,
      confirm: async (title) =>
        title === "Feature slug" ? true : title === "Replace existing feature?" ? true : false,
      setStatus: () => undefined,
      notify: () => undefined,
    },
  };
}
