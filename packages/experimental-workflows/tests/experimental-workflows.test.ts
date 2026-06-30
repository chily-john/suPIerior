import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPrivateSkillsForTests,
  findPrivateSkill,
  listPrivateSkills,
} from "../../workflower/extension-src/workflower/internals/workflow-orchestration/runtime/private-skills/private-skill-registry";

const privateSkillDirectory = "./extension-src/experimental-workflows/internals/skills";

async function loadExperimentalWorkflows(): Promise<Record<string, any>> {
  return import("../extension-src/experimental-workflows/index");
}

async function loadExperimentalWorkflowsManifest(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
}

const skillPaths = {
  "counter-init": "counter/skills/init/SKILL.md",
  "counter-start-loop": "counter/skills/start-loop/SKILL.md",
  "counter-increment": "counter/skills/increment/SKILL.md",
  "counter-continue": "counter/skills/continue/SKILL.md",
  "stateful-grilling-ask": "stateful-grilling/skills/ask/SKILL.md",
  "stateful-grilling-update": "stateful-grilling/skills/update/SKILL.md",
  "stateful-grilling-continue": "stateful-grilling/skills/continue/SKILL.md",
  "stateful-grilling-finalize": "stateful-grilling/skills/finalize/SKILL.md",
} as const;

async function readExperimentalSkill(name: keyof typeof skillPaths): Promise<string> {
  return readFile(
    new URL(
      `../extension-src/experimental-workflows/internals/skills/${skillPaths[name]}`,
      import.meta.url,
    ),
    "utf8",
  );
}

describe("experimental-workflows package", () => {
  beforeEach(() => {
    clearPrivateSkillsForTests();
  });

  it("declares experimental workflow skills as workflowerSkills", async () => {
    const pkg = await loadExperimentalWorkflowsManifest();

    expect(pkg.pi.skills).toBeUndefined();
    expect(pkg.pi.workflowerSkills).toEqual([privateSkillDirectory]);
  });

  it("exports, registers, and initializes the experimental workflows", async () => {
    const {
      counterLoopWorkflow,
      counterWorkflow,
      statefulGrillingFinalizeWorkflow,
      statefulGrillingWorkflow,
      default: registerExperimentalWorkflows,
    } = await loadExperimentalWorkflows();
    const pi = createPiHarness();

    expect(counterWorkflow).toEqual({
      id: "counter",
      clearOnStart: true,
      clearOnCompletion: false,
      cleanupOnCompletion: true,
      model: "medium",
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
      model: "medium",
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
    expect(statefulGrillingWorkflow).toEqual({
      id: "stateful-grilling",
      modelInvocable: true,
      clearOnStart: true,
      clearOnCompletion: false,
      cleanupOnCompletion: true,
      model: "medium",
      thinkingLevel: "medium",
      steps: [
        {
          id: "ask-grilling-questions",
          command: "/skill:stateful-grilling-ask",
          clearOnNext: false,
        },
        {
          id: "update-feature-description-state",
          command: "/skill:stateful-grilling-update",
          autoNext: true,
          clearOnNext: true,
        },
        {
          id: "continue-or-finalize-grilling",
          command: "/skill:stateful-grilling-continue",
          clearOnNext: true,
        },
      ],
    });
    expect(statefulGrillingFinalizeWorkflow).toEqual({
      id: "stateful-grilling-finalize",
      userInvocable: false,
      modelInvocable: true,
      clearOnStart: true,
      clearOnCompletion: false,
      cleanupOnCompletion: false,
      model: "medium",
      thinkingLevel: "medium",
      steps: [
        {
          id: "write-feature-description",
          command: "/skill:stateful-grilling-finalize",
          outputs: ["feature-description.md"],
          autoNext: true,
          clearOnNext: true,
        },
      ],
    });

    registerExperimentalWorkflows(pi);

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:counter"]).toBeDefined();
    expect(pi.commands["wf:counter-loop"]).toBeUndefined();
    expect(pi.commands["wf:stateful-grilling"]).toBeDefined();
    expect(pi.commands["wf:stateful-grilling-finalize"]).toBeUndefined();
  }, 10_000);

  it("can initialize repeatedly across Pi extension rebinds", async () => {
    const { default: registerExperimentalWorkflows } = await loadExperimentalWorkflows();
    const pi = createPiHarness();

    expect(() => registerExperimentalWorkflows(pi)).not.toThrow();
    expect(() => registerExperimentalWorkflows(pi)).not.toThrow();

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:counter"]).toBeDefined();
    expect(pi.commands["wf:counter-loop"]).toBeUndefined();
    expect(pi.commands["wf:stateful-grilling"]).toBeDefined();
    expect(pi.commands["wf:stateful-grilling-finalize"]).toBeUndefined();
  });

  it("loads experimental workflow private skills during extension setup", async () => {
    const { default: registerExperimentalWorkflows } = await loadExperimentalWorkflows();
    const pi = createPiHarness();

    expect(findPrivateSkill("counter-start-loop")).toBeUndefined();

    registerExperimentalWorkflows(pi);

    expect(findPrivateSkill("counter-start-loop")).toBeDefined();
    expect(findPrivateSkill("stateful-grilling-ask")).toBeDefined();
    expect(findPrivateSkill("stateful-grilling-finalize")).toBeDefined();

    const privateSkillCount = listPrivateSkills().length;
    registerExperimentalWorkflows(pi);

    expect(listPrivateSkills()).toHaveLength(privateSkillCount);
  });

  it("counter skills use garden state and handoff instead of output files", async () => {
    const init = await readExperimentalSkill("counter-init");
    const startLoop = await readExperimentalSkill("counter-start-loop");
    const increment = await readExperimentalSkill("counter-increment");
    const continueLoop = await readExperimentalSkill("counter-continue");

    expect(init).toContain("workflower_state_set");
    expect(startLoop).toContain("workflower_state_get");
    expect(increment).toContain("workflower_state_get");
    expect(increment).toContain("workflower_state_set");
    expect(continueLoop).toContain("workflower_state_get");
    expect(startLoop).toContain("workflower_handoff");
    expect(continueLoop).toContain("workflower_handoff");
    expect(startLoop).toContain("Do not print or send `/wf:counter-loop` as text");
    expect(continueLoop).toContain("Do not print or send `/wf:counter-loop` as text");
    expect(`${init}\n${startLoop}\n${increment}\n${continueLoop}`).not.toContain(
      "counter-state.json",
    );
  });

  it("stateful-grilling skills use garden state, cleared-loop handoff, and final output", async () => {
    const ask = await readExperimentalSkill("stateful-grilling-ask");
    const update = await readExperimentalSkill("stateful-grilling-update");
    const continueLoop = await readExperimentalSkill("stateful-grilling-continue");
    const finalize = await readExperimentalSkill("stateful-grilling-finalize");

    expect(ask).toContain("workflower_state_get");
    expect(ask).toContain("Ask 1 to 3 questions, no more");
    expect(update).toContain("workflower_state_set");
    expect(update).toContain("understandingPercent");
    expect(update).toContain("95");
    expect(continueLoop).toContain("workflower_handoff");
    expect(continueLoop).toContain('workflowId `"stateful-grilling"`');
    expect(continueLoop).toContain('workflowId `"stateful-grilling-finalize"`');
    expect(finalize).toContain("feature-description.md");
    expect(finalize).toContain("workflower_state_get");
    expect(finalize).toContain("write");
  });
});

function createPiHarness(): {
  commands: Record<string, any>;
  tools: Record<string, any>;
  handlers: Record<string, any[]>;
  sentUserMessages: Array<{ prompt: string; options: any }>;
  messageRenderers: Record<string, any>;
  registerCommand: (name: string, command: any) => void;
  registerTool: (tool: any) => void;
  registerMessageRenderer: (name: string, renderer: any) => void;
  on: (name: string, handler: any) => void;
  sendUserMessage: (prompt: string, options?: any) => void;
} {
  return {
    commands: {},
    tools: {},
    handlers: {},
    sentUserMessages: [],
    messageRenderers: {},
    registerCommand(name, command) {
      this.commands[name] = command;
    },
    registerTool(tool) {
      this.tools[tool.name] = tool;
    },
    registerMessageRenderer(name, renderer) {
      this.messageRenderers[name] = renderer;
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
