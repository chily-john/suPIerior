import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function loadFeatureWorkflow(): Promise<Record<string, any>> {
  return import("../extension-src/feature-workflow/index");
}

describe("feature-workflow package", () => {
  it("exports, registers, and initializes the feature workflows", async () => {
    const {
      counterLoopWorkflow,
      counterWorkflow,
      default: registerFeatureWorkflow,
      newFeatureWorkflow,
      takeItAwayWorkflow,
    } = await loadFeatureWorkflow();
    const pi = createPiHarness();

    expect(newFeatureWorkflow).toEqual({
      id: "new-feature",
      cleanupOnCompletion: true,
      pollen: "issues.md",
      steps: [
        { id: "grill", command: "/skill:new-feature-grill", clearOnNext: false },
        {
          id: "summary",
          command: "/skill:new-feature-summary",
          outputs: ["feature-summary.md"],
          autoNext: true,
        },
        {
          id: "convert-to-issues-prep",
          command: "/skill:new-feature-convert-to-issues-prep",
          outputs: ["issues.md"],
          autoNext: true,
        },
        {
          id: "review-issues",
          command: "/skill:new-feature-review-issues",
          outputs: ["issues.md"],
          autoNext: true,
        },
        { id: "publish-issues", command: "/skill:new-feature-publish-issues", autoNext: true },
      ],
    });
    expect(takeItAwayWorkflow).toEqual({
      id: "take-it-away",
      cleanupOnCompletion: true,
      clearOnStart: false,
      pollen: "implementation-review.md",
      steps: [
        {
          id: "summarize-context",
          command: "/skill:take-it-away-summary",
          outputs: ["context-summary.md"],
          autoNext: true,
          clearOnNext: true,
        },
        {
          id: "plan-implementation",
          command: "/skill:take-it-away-plan",
          outputs: ["implementation-plan.md"],
          autoNext: true,
          clearOnNext: true,
        },
        {
          id: "review-plan",
          command: "/skill:take-it-away-review-plan",
          outputs: ["implementation-plan.md"],
          autoNext: true,
          clearOnNext: true,
        },
        {
          id: "implement-plan",
          command: "/skill:implementor",
          autoNext: true,
          clearOnNext: true,
        },
        {
          id: "review-implementation",
          command: "/skill:reviewer",
          outputs: ["implementation-review.md"],
          autoNext: true,
        },
      ],
    });
    expect(counterWorkflow).toEqual({
      id: "counter",
      clearOnStart: true,
      clearOnCompletion: false,
      cleanupOnCompletion: true,
      model: [
        "openai/gpt-5.3-codex-spark",
        "azure-openai-responses/gpt-5.3-codex-spark",
        "openai-codex/gpt-5.3-codex-spark",
      ],
      thinkingLevel: "low",
      pollen: "counter-state.json",
      steps: [
        {
          id: "initialize-counter",
          command: "/skill:counter-init",
          outputs: ["counter-state.json"],
          clearOnNext: true,
        },
        {
          id: "start-counter-loop",
          command: "/skill:counter-start-loop",
          autoNext: true,
          clearOnNext: true,
        },
      ],
    });
    expect(counterLoopWorkflow).toEqual({
      id: "counter-loop",
      clearOnStart: true,
      clearOnCompletion: false,
      cleanupOnCompletion: true,
      model: [
        "openai/gpt-5.3-codex-spark",
        "azure-openai-responses/gpt-5.3-codex-spark",
        "openai-codex/gpt-5.3-codex-spark",
      ],
      thinkingLevel: "low",
      pollen: "counter-state.json",
      steps: [
        {
          id: "increment-counter",
          command: "/skill:counter-increment",
          outputs: ["counter-state.json"],
          autoNext: true,
          clearOnNext: true,
        },
        {
          id: "continue-counter-loop",
          command: "/skill:counter-continue",
          autoNext: true,
          clearOnNext: true,
        },
      ],
    });

    registerFeatureWorkflow(pi);

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:new-feature"]).toBeDefined();
    expect(pi.commands["wf:take-it-away"]).toBeDefined();
    expect(pi.commands["wf:counter"]).toBeDefined();
    expect(pi.commands["wf:counter-loop"]).toBeDefined();
  }, 10_000);

  it("can initialize repeatedly across Pi extension rebinds", async () => {
    const { default: registerFeatureWorkflow } = await loadFeatureWorkflow();
    const pi = createPiHarness();

    expect(() => registerFeatureWorkflow(pi)).not.toThrow();
    expect(() => registerFeatureWorkflow(pi)).not.toThrow();

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:new-feature"]).toBeDefined();
    expect(pi.commands["wf:take-it-away"]).toBeDefined();
    expect(pi.commands["wf:counter"]).toBeDefined();
    expect(pi.commands["wf:counter-loop"]).toBeDefined();
  });

  it("counter handoff skills instruct the agent to call workflower_handoff", async () => {
    const startLoop = await readFile(
      new URL(
        "../extension-src/feature-workflow/internals/skills/counter-start-loop/SKILL.md",
        import.meta.url,
      ),
      "utf8",
    );
    const continueLoop = await readFile(
      new URL(
        "../extension-src/feature-workflow/internals/skills/counter-continue/SKILL.md",
        import.meta.url,
      ),
      "utf8",
    );

    expect(startLoop).toContain("workflower_handoff");
    expect(continueLoop).toContain("workflower_handoff");
    expect(startLoop).toContain("Do not print or send `/wf:counter-loop` as text");
    expect(continueLoop).toContain("Do not print or send `/wf:counter-loop` as text");
  });
});

function createPiHarness(): {
  commands: Record<string, any>;
  tools: Record<string, any>;
  handlers: Record<string, any[]>;
  sentUserMessages: Array<{ prompt: string; options: any }>;
  registerCommand: (name: string, command: any) => void;
  registerTool: (tool: any) => void;
  on: (name: string, handler: any) => void;
  sendUserMessage: (prompt: string, options?: any) => void;
} {
  return {
    commands: {},
    tools: {},
    handlers: {},
    sentUserMessages: [],
    registerCommand(name, command) {
      this.commands[name] = command;
    },
    registerTool(tool) {
      this.tools[tool.name] = tool;
    },
    on(name, handler) {
      this.handlers[name] ??= [];
      this.handlers[name].push(handler);
    },
    sendUserMessage(prompt, options) {
      this.sentUserMessages.push({ prompt, options });
    },
  };
}
