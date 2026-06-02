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
  renderDiscoveryPrompt,
  renderRepairDiscoveryPrompt,
} from "../extension-src/feature-flow/templates/prompts";
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
  it("parses fenced JSON responses using one next question", () => {
    const response = parseDiscoveryModelResponse(
      '```json\n{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":3,"question":{"id":"q1","text":"Why?"}}\n```',
    );

    expect(response.question?.id).toBe("q1");
    expect(response.estimatedNumberOfQuestionsRemaining).toBe(3);
  });

  it("accepts ready responses without a question", () => {
    expect(
      parseDiscoveryModelResponse(
        '{"message":"Ready to generate.","readyToGenerate":true,"estimatedNumberOfQuestionsRemaining":0}',
      ),
    ).toEqual({
      message: "Ready to generate.",
      readyToGenerate: true,
      estimatedNumberOfQuestionsRemaining: 0,
    });
  });

  it("rejects not-ready responses without a question", () => {
    expect(() =>
      parseDiscoveryModelResponse(
        '{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":1}',
      ),
    ).toThrow(/question is required/i);
  });

  it.each([
    ["missing", '{"readyToGenerate":false,"question":{"id":"q1","text":"Why?"}}'],
    [
      "negative",
      '{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":-1,"question":{"id":"q1","text":"Why?"}}',
    ],
    [
      "fractional",
      '{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":1.5,"question":{"id":"q1","text":"Why?"}}',
    ],
    [
      "non-number",
      '{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":"1","question":{"id":"q1","text":"Why?"}}',
    ],
  ])("rejects %s estimatedNumberOfQuestionsRemaining", (_name, output) => {
    expect(() => parseDiscoveryModelResponse(output)).toThrow(
      /estimatedNumberOfQuestionsRemaining must be a non-negative integer/,
    );
  });

  it("rejects blank question fields", () => {
    expect(() =>
      parseDiscoveryModelResponse(
        '{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":1,"question":{"id":" ","text":"Why?"}}',
      ),
    ).toThrow(/question.id must be a non-empty string/);
    expect(() =>
      parseDiscoveryModelResponse(
        '{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":1,"question":{"id":"q1","text":" "}}',
      ),
    ).toThrow(/question.text must be a non-empty string/);
  });

  it("rejects the old questions backlog schema", () => {
    expect(() =>
      parseDiscoveryModelResponse(
        '{"readyToGenerate":false,"estimatedNumberOfQuestionsRemaining":1,"questions":[{"id":"q1","text":"Why?"}]}',
      ),
    ).toThrow(/question is required/i);
  });

  it("rejects malformed responses", () => {
    expect(() => parseDiscoveryModelResponse("not json")).toThrow(/valid JSON/);
  });
});

describe("discovery prompts", () => {
  it("instructs the model to ask exactly one question without a backlog", () => {
    const prompt = renderDiscoveryPrompt(
      {
        description: "Build demo",
        slug: "build-demo",
        answers: [{ questionId: "q1", questionText: "First?", answer: "First answer" }],
        turns: 2,
      },
      mergeConfig({ questions: { maxTurns: 4, maxQuestions: 6 } as never }),
    );

    expect(prompt).toContain("exactly one next best question");
    expect(prompt).toContain("Do not generate a backlog");
    expect(prompt).toContain("Re-evaluate the full feature state and all prior answers every turn");
    expect(prompt).toContain("estimatedNumberOfQuestionsRemaining");
    expect(prompt).toContain("Never reuse an answered question id");
    expect(prompt).toContain('"question"');
    expect(prompt).not.toContain('"questions"');
    expect(prompt).toContain("remaining turn budget");
    expect(prompt).toContain("remaining question budget");
  });

  it("repairs malformed model output using the new schema", () => {
    const prompt = renderRepairDiscoveryPrompt("not json", "Validation error");

    expect(prompt).toContain("estimatedNumberOfQuestionsRemaining");
    expect(prompt).toContain('"question"');
    expect(prompt).not.toContain('"questions"');
  });
});

describe("workflow", () => {
  it("writes final artifacts and removes draft", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const inputs = ["It should help users plan work."];
    const adapter = new MockAdapter([
      JSON.stringify({
        readyToGenerate: false,
        estimatedNumberOfQuestionsRemaining: 1,
        question: { id: "q1", text: "What problem should this solve?" },
      }),
      JSON.stringify({
        message: "Ready to generate.",
        readyToGenerate: true,
        estimatedNumberOfQuestionsRemaining: 0,
      }),
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
      JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 }),
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

  it("records sequential one-question discovery turns", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const asked: string[] = [];
    const adapter = new MockAdapter([
      JSON.stringify({
        readyToGenerate: false,
        estimatedNumberOfQuestionsRemaining: 2,
        question: { id: "q1", text: "First question" },
      }),
      JSON.stringify({
        readyToGenerate: false,
        estimatedNumberOfQuestionsRemaining: 1,
        question: { id: "q2", text: "Second question based on answer 1" },
      }),
      JSON.stringify({
        message: "Ready to generate.",
        readyToGenerate: true,
        estimatedNumberOfQuestionsRemaining: 0,
      }),
    ]);
    const ctx = createContext(dir, ["answer 1", "answer 2"], adapter, asked);
    try {
      await mkdir(join(dir, ".pi"));
      const state = await runDiscoveryLoop({
        description: "Build demo",
        slug: "build-demo",
        ctx,
        config: mergeConfig({}),
        modelAdapter: adapter,
      });

      expect(asked).toEqual(["First question", "Second question based on answer 1"]);
      expect(state.turns).toBe(3);
      expect(state.answers).toEqual([
        { questionId: "q1", questionText: "First question", answer: "answer 1" },
        { questionId: "q2", questionText: "Second question based on answer 1", answer: "answer 2" },
      ]);
      expect(adapter.prompts[1]).toContain("answer 1");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails clearly when a not-ready response omits the next question", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const adapter = new MockAdapter([
      JSON.stringify({ readyToGenerate: false, estimatedNumberOfQuestionsRemaining: 1 }),
      JSON.stringify({ readyToGenerate: false, estimatedNumberOfQuestionsRemaining: 1 }),
      JSON.stringify({ readyToGenerate: false, estimatedNumberOfQuestionsRemaining: 1 }),
    ]);
    const ctx = createContext(dir, [], adapter);
    try {
      await mkdir(join(dir, ".pi"));
      await expect(
        runDiscoveryLoop({
          description: "Build demo",
          slug: "build-demo",
          ctx,
          config: mergeConfig({}),
          modelAdapter: adapter,
        }),
      ).rejects.toThrow(/question is required/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("repairs malformed model output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feature-flow-"));
    const adapter = new MockAdapter([
      "not json",
      JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 }),
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
    const adapter = new MockAdapter([
      JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 }),
    ]);
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
            estimatedNumberOfQuestionsRemaining: 1,
            question: { id: "q1", text: "What problem should this solve?" },
          });
        }
        if (promptCount === 2) {
          expect(workingVisible).toBe(true);
          expect(widgetRender?.(80)).toEqual([
            "What problem should this solve?",
            "",
            "Answer: It should help users plan work.",
          ]);
          return JSON.stringify({
            readyToGenerate: true,
            estimatedNumberOfQuestionsRemaining: 0,
          });
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
    const adapter = new MockAdapter([
      JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 }),
    ]);
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

  it("shows discovery loading immediately while the first generated question is pending", async () => {
    const harness = createWorkflowUiHarness();
    const firstModelResponse = createDeferred<string>();
    const firstModelStarted = createDeferred<void>();
    let completeCount = 0;
    const adapter = {
      async complete(): Promise<string> {
        completeCount += 1;
        if (completeCount === 1) {
          firstModelStarted.resolve();
          return firstModelResponse.promise;
        }
        return JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 });
      },
    };
    const ctx = createContext(".", [], adapter);
    ctx.ui = harness.ui;

    const run = runDiscoveryLoop({
      description: "Build demo",
      slug: "build-demo",
      ctx,
      config: mergeConfig({}),
      modelAdapter: adapter,
    });

    await firstModelStarted.promise;

    expect(harness.screen(80)).toContain("feature-flow: Discovery");
    expect(harness.screen(80)).toContain("Working:\nAnalyzing feature discovery…");
    expect(harness.input("typed while first question loads")).toEqual({ consume: true });

    firstModelResponse.resolve(
      JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 }),
    );
    await run;
    expect(harness.screen(80)).not.toContain("Working:");
    expect(harness.screen(80)).not.toContain("feature-flow: Discovery");
  });

  it("shows model estimated remaining count while a generated question is active", async () => {
    const harness = createWorkflowUiHarness();
    const widgetWaiters: Array<() => void> = [];
    const originalSetWidget = harness.ui.setWidget?.bind(harness.ui) as
      | ((
          key: string,
          content: unknown,
          options?: { placement?: "aboveEditor" | "belowEditor" },
        ) => void)
      | undefined;
    harness.ui.setWidget = (key, content, options) => {
      originalSetWidget?.(key, content, options);
      for (const notify of [...widgetWaiters]) notify();
    };
    const waitForWidgetText = (text: string): Promise<void> =>
      new Promise((resolve) => {
        const notify = () => {
          if (harness.renderWidget("feature-flow-question", 80).join("\n").includes(text)) {
            const index = widgetWaiters.indexOf(notify);
            if (index >= 0) widgetWaiters.splice(index, 1);
            resolve();
          }
        };
        widgetWaiters.push(notify);
        notify();
      });
    let completeCount = 0;
    const adapter = {
      async complete(): Promise<string> {
        completeCount += 1;
        if (completeCount === 1) {
          return JSON.stringify({
            readyToGenerate: false,
            estimatedNumberOfQuestionsRemaining: 3,
            question: { id: "q1", text: "First question" },
          });
        }
        return JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 });
      },
    };
    const ctx = createContext(".", [], adapter);
    ctx.ui = harness.ui;

    const run = runDiscoveryLoop({
      description: "Build demo",
      slug: "build-demo",
      ctx,
      config: mergeConfig({ questions: { maxQuestions: 8 } as never }),
      modelAdapter: adapter,
    });

    await waitForWidgetText("First question");
    expect(harness.screen(80)).toContain("feature-flow: Discovery · 3 remaining");
    harness.ui.setEditorText?.("answer 1");
    expect(harness.enter()).toEqual({ consume: true });

    await run;
  });

  it("shows loading while the next generated question is pending after an answer", async () => {
    const harness = createWorkflowUiHarness();
    const secondModelResponse = createDeferred<string>();
    const secondModelStarted = createDeferred<void>();
    let completeCount = 0;
    const widgetWaiters: Array<() => void> = [];
    const originalSetWidget = harness.ui.setWidget?.bind(harness.ui) as
      | ((
          key: string,
          content: unknown,
          options?: { placement?: "aboveEditor" | "belowEditor" },
        ) => void)
      | undefined;
    harness.ui.setWidget = (key, content, options) => {
      originalSetWidget?.(key, content, options);
      for (const notify of [...widgetWaiters]) notify();
    };
    const waitForWidgetText = (text: string): Promise<void> =>
      new Promise((resolve) => {
        const notify = () => {
          if (harness.renderWidget("feature-flow-question", 80).join("\n").includes(text)) {
            const index = widgetWaiters.indexOf(notify);
            if (index >= 0) widgetWaiters.splice(index, 1);
            resolve();
          }
        };
        widgetWaiters.push(notify);
        notify();
      });

    const adapter = {
      async complete(): Promise<string> {
        completeCount += 1;
        if (completeCount === 1) {
          return JSON.stringify({
            readyToGenerate: false,
            estimatedNumberOfQuestionsRemaining: 1,
            question: { id: "q1", text: "First question" },
          });
        }
        if (completeCount === 2) {
          secondModelStarted.resolve();
          return secondModelResponse.promise;
        }
        return JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 });
      },
    };
    const firstQuestionVisible = waitForWidgetText("First question");
    const ctx = createContext(".", [], adapter);
    ctx.ui = harness.ui;

    const run = runDiscoveryLoop({
      description: "Build demo",
      slug: "build-demo",
      ctx,
      config: mergeConfig({}),
      modelAdapter: adapter,
    });

    await firstQuestionVisible;
    harness.ui.setEditorText?.("answer 1");
    expect(harness.enter()).toEqual({ consume: true });
    await secondModelStarted.promise;

    expect(
      harness.timelineText(),
      "Expected working indicator while next question is pending.",
    ).toContain("working:indicator");
    expect(
      harness.timelineText(),
      "Expected loading to be visible while next question is pending.",
    ).toContain("working:visible true");
    expect(harness.screen(80)).toContain("Answer: answer 1");
    expect(harness.screen(80)).toContain("Working:\nAnalyzing feature discovery…");
    expect(harness.input("typed while loading")).toEqual({ consume: true });

    const secondQuestionVisible = waitForWidgetText("Second question");
    secondModelResponse.resolve(
      JSON.stringify({
        readyToGenerate: false,
        estimatedNumberOfQuestionsRemaining: 1,
        question: { id: "q2", text: "Second question" },
      }),
    );
    await secondQuestionVisible;

    expect(harness.screen(80)).not.toContain("Working:");
    expect(harness.input("typed into ready input")).toEqual({ consume: false });
    harness.ui.setEditorText?.("answer 2");
    expect(harness.enter()).toEqual({ consume: true });

    await run;
    expect(harness.screen(80)).not.toContain("Working:");
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
            estimatedNumberOfQuestionsRemaining: 1,
            question: { id: "q1", text: "First question" },
          });
        }
        if (completeCount === 2) {
          expect(workingVisible).toBe(true);
          expect(terminalHandler?.("typed while loading")).toEqual({ consume: true });
          expect(currentWidget?.(80)).toEqual(["First question", "", "Answer: answer 1"]);
          return JSON.stringify({
            readyToGenerate: false,
            estimatedNumberOfQuestionsRemaining: 1,
            question: { id: "q2", text: "Second question" },
          });
        }
        return JSON.stringify({ readyToGenerate: true, estimatedNumberOfQuestionsRemaining: 0 });
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

function createWorkflowUiHarness(): {
  ui: FeatureWorkflowContext["ui"];
  enter(): { consume?: boolean; data?: string } | undefined;
  input(data: string): { consume?: boolean; data?: string } | undefined;
  timelineText(): string;
  screen(width: number): string;
  renderWidget(key: string, width: number): string[];
} {
  const events: string[] = [];
  const statuses = new Map<string, string>();
  const widgets = new Map<string, unknown>();
  let editorText = "";
  let terminalHandler:
    | ((data: string) => { consume?: boolean; data?: string } | undefined)
    | undefined;
  let workingMessage: string | undefined;
  let workingVisible = false;

  const record = (event: string): void => {
    events.push(event);
  };
  const renderWidgetContent = (content: unknown, width: number): string[] => {
    if (Array.isArray(content)) return content;
    if (typeof content !== "function") return [];
    const widget = content({}, {});
    return widget.render(width);
  };

  const ui: FeatureWorkflowContext["ui"] = {
    input: async () => editorText,
    select: async () => undefined,
    confirm: async () => true,
    setStatus: (key, value) => {
      if (value === undefined) statuses.delete(key);
      else statuses.set(key, value);
      record(`setStatus ${key}=${value ?? "cleared"}`);
    },
    setEditorText: (text) => {
      editorText = text;
      record(`setEditorText ${text}`);
    },
    getEditorText: () => {
      record(`getEditorText ${editorText}`);
      return editorText;
    },
    setWidget: (key, content, options) => {
      if (content === undefined) {
        widgets.delete(key);
        record(`setWidget ${key} cleared`);
        return;
      }
      if ((options?.placement ?? "default") === "aboveEditor") widgets.set(key, content);
      record(`setWidget ${key}`);
    },
    onTerminalInput: (handler) => {
      terminalHandler = handler;
      record("onTerminalInput subscribe");
      return () => {
        if (terminalHandler === handler) terminalHandler = undefined;
        record("onTerminalInput unsubscribe");
      };
    },
    setWorkingIndicator: () => {
      record("working:indicator");
    },
    setWorkingMessage: (message) => {
      workingMessage = message;
      record(`working:message ${message ?? "default"}`);
    },
    setWorkingVisible: (visible) => {
      workingVisible = visible;
      record(`working:visible ${visible}`);
    },
    notify: () => undefined,
  };

  const sendInput = (data: string): { consume?: boolean; data?: string } | undefined =>
    terminalHandler?.(data) ?? { consume: false };

  return {
    ui,
    enter: () => sendInput("\r"),
    input: sendInput,
    timelineText: () => events.map((event, index) => `${index + 1}. ${event}`).join("\n"),
    screen: (width) => {
      const sections: string[] = [];
      const renderedWidgets = Array.from(widgets.values()).flatMap((content) =>
        renderWidgetContent(content, width),
      );
      if (renderedWidgets.length > 0)
        sections.push(["Above editor:", ...renderedWidgets].join("\n"));
      const statusLines = Array.from(statuses.entries()).map(([key, value]) => `${key}: ${value}`);
      if (statusLines.length > 0) sections.push(["Status:", ...statusLines].join("\n"));
      if (workingVisible) sections.push(["Working:", workingMessage ?? "default"].join("\n"));
      return sections.join("\n\n");
    },
    renderWidget: (key, width) => {
      const content = widgets.get(key);
      return content ? renderWidgetContent(content, width) : [];
    },
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

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
