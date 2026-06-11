import { describe, expect, it } from "vitest";

async function loadFeatureWorkflow(): Promise<Record<string, any>> {
  return import("../extension-src/feature-workflow/index");
}

describe("feature-workflow package", () => {
  it("exports, registers, and initializes the feature workflows", async () => {
    const {
      default: registerFeatureWorkflow,
      newFeatureWorkflow,
      takeItAwayWorkflow,
    } = await loadFeatureWorkflow();
    const pi = createPiHarness();

    expect(newFeatureWorkflow).toEqual({
      id: "new-feature",
      cleanupOnCompletion: true,
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

    registerFeatureWorkflow(pi);

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:new-feature"]).toBeDefined();
    expect(pi.commands["wf:take-it-away"]).toBeDefined();
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
  });
});

function createPiHarness(): {
  commands: Record<string, any>;
  handlers: Record<string, any[]>;
  sentUserMessages: Array<{ prompt: string; options: any }>;
  registerCommand: (name: string, command: any) => void;
  on: (name: string, handler: any) => void;
  sendUserMessage: (prompt: string, options?: any) => void;
} {
  return {
    commands: {},
    handlers: {},
    sentUserMessages: [],
    registerCommand(name, command) {
      this.commands[name] = command;
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
