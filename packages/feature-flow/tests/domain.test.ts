import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { mergeConfig } from "../extension-src/feature-flow/domain/config";
import { parseDiscoveryModelResponse } from "../extension-src/feature-flow/domain/discovery/parse-response";
import { resolveArtifactPaths } from "../extension-src/feature-flow/domain/paths";
import { proposeSlug, sanitizeSlug } from "../extension-src/feature-flow/domain/slug";
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
      input: async (prompt) => {
        asked.push(prompt);
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
