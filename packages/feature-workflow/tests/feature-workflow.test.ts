import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPrivateSkillsForTests,
  findPrivateSkill,
  listPrivateSkills,
} from "../../workflower/extension-src/workflower/internals/workflow-orchestration/runtime/private-skills/private-skill-registry";

const privateSkillDirectory = "./extension-src/feature-workflow/internals/skills";
const ruleplementorSkillDirectory = "./node_modules/@supierior/ruleplementor/skills";

async function loadFeatureWorkflow(): Promise<Record<string, any>> {
  return import("../extension-src/feature-workflow/index");
}

async function loadFeatureWorkflowManifest(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
}

async function readCounterSkill(name: string): Promise<string> {
  return readFile(
    new URL(`../extension-src/feature-workflow/internals/skills/${name}/SKILL.md`, import.meta.url),
    "utf8",
  );
}

describe("feature-workflow package", () => {
  beforeEach(() => {
    clearPrivateSkillsForTests();
  });

  it("declares workflow-only skills as workflowerSkills instead of public pi skills", async () => {
    const pkg = await loadFeatureWorkflowManifest();

    expect(pkg.pi.skills).toEqual([ruleplementorSkillDirectory]);
    expect(pkg.pi.skills).not.toContain(privateSkillDirectory);
    expect(pkg.pi.workflowerSkills).toEqual([privateSkillDirectory]);
  });

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
      model: ["openai/gpt-5.4-mini"],
      thinkingLevel: "low",
      steps: [
        {
          id: "initialize-counter",
          command: "/skill:counter-init",
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
      userInvocable: false,
      modelInvocable: true,
      clearOnStart: true,
      clearOnCompletion: false,
      cleanupOnCompletion: true,
      model: ["openai/gpt-5.4-mini"],
      thinkingLevel: "low",
      steps: [
        {
          id: "increment-counter",
          command: "/skill:counter-increment",
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
    expect(pi.commands["wf:counter-loop"]).toBeUndefined();
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
    expect(pi.commands["wf:counter-loop"]).toBeUndefined();
  });

  it("loads feature workflow private skills during extension setup", async () => {
    const { default: registerFeatureWorkflow } = await loadFeatureWorkflow();
    const pi = createPiHarness();

    expect(findPrivateSkill("new-feature-grill")).toBeUndefined();

    registerFeatureWorkflow(pi);

    expect(findPrivateSkill("new-feature-grill")).toMatchObject({
      name: "new-feature-grill",
      description: expect.stringContaining("clarifies"),
    });
    expect(findPrivateSkill("counter-start-loop")).toBeDefined();

    const privateSkillCount = listPrivateSkills().length;
    registerFeatureWorkflow(pi);

    expect(listPrivateSkills()).toHaveLength(privateSkillCount);
  });

  it("counter skills use garden state and handoff instead of output files", async () => {
    const init = await readCounterSkill("counter-init");
    const startLoop = await readCounterSkill("counter-start-loop");
    const increment = await readCounterSkill("counter-increment");
    const continueLoop = await readCounterSkill("counter-continue");

    expect(init).toContain("workflower_state_set");
    expect(startLoop).toContain("workflower_state_get");
    expect(increment).toContain("workflower_state_get");
    expect(increment).toContain("workflower_state_set");
    expect(continueLoop).toContain("workflower_state_get");
    expect(startLoop).toContain("workflower_handoff");
    expect(continueLoop).toContain("workflower_handoff");
    expect(startLoop).toContain("Do not print or send `/wf:counter-loop` as text");
    expect(continueLoop).toContain("Do not print or send `/wf:counter-loop` as text");
    expect(`${init}\n${startLoop}\n${increment}\n${continueLoop}`).not.toContain("counter-state.json");
  });

  it("documents review-loop garden state routing", async () => {
    const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

    expect(readme).toContain("Review-loop garden state example");
    expect(readme).toContain("workflower_state_set");
    expect(readme).toContain("review.rating");
    expect(readme).toContain("review.summary");
    expect(readme).toContain("review.required_changes");
    expect(readme).toContain("createWorkflowerRuntime");
    expect(readme).toContain("implementation-review-loop");
    expect(readme).toContain("feature-next-steps");
    expect(readme).toContain("wf.handoff");
    expect(readme).toContain("assistant text does not execute slash commands");
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
