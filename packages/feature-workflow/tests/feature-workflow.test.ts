import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { routeFeatureWorkflow } from "../extension-src/feature-workflow/internals/workflow-routing/register-feature-workflow-commands";
import {
  clearPrivateSkillsForTests,
  findPrivateSkill,
  listPrivateSkills,
} from "../../workflower/extension-src/workflower/internals/workflow-orchestration/runtime/private-skills/private-skill-registry";

const privateSkillDirectory = "./extension-src/feature-workflow/internals/skills";

async function loadFeatureWorkflow(): Promise<Record<string, any>> {
  return import("../extension-src/feature-workflow/index");
}

async function loadFeatureWorkflowManifest(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
}

describe("feature-workflow package", () => {
  beforeEach(() => {
    clearPrivateSkillsForTests();
  });

  it("declares feature workflow skills as private Workflower skills", async () => {
    const pkg = await loadFeatureWorkflowManifest();

    expect(pkg.pi.skills).toEqual([]);
    expect(pkg.pi.workflowerSkills).toEqual([privateSkillDirectory]);
  });

  it("exports the user-facing and private loop workflow definitions", async () => {
    const {
      featureDocWorkflow,
      implementationDocLoopWorkflow,
      implementationStoriesSplitWorkflow,
      newFeatureWorkflow,
      storyImplementationLoopWorkflow,
      takeItAwayWorkflow,
    } = await loadFeatureWorkflow();

    expect(newFeatureWorkflow).toMatchObject({
      id: "new-feature",
      clearOnStart: true,
      cleanupOnCompletion: false,
      model: "medium",
      thinkingLevel: "low",
      pollen: "feature-doc.md",
    });
    expect(newFeatureWorkflow.steps.map((step: any) => step.id)).toEqual([
      "grill",
      "create-feature-doc",
      "start-implementation-doc-loop",
    ]);
    expect(newFeatureWorkflow.steps[0]).toMatchObject({
      command: "/skill:feature-grill",
      thinkingLevel: "medium",
      clearOnNext: false,
    });
    expect(newFeatureWorkflow.steps[1]).toMatchObject({
      command: "/skill:feature-doc-create",
      thinkingLevel: "medium",
    });
    expect(newFeatureWorkflow.steps[2]).toMatchObject({
      command: "/feature-workflow-route start-implementation-doc-loop",
      thinkingLevel: "minimal",
    });

    expect(takeItAwayWorkflow).toMatchObject({
      id: "take-it-away",
      clearOnStart: false,
      cleanupOnCompletion: false,
      model: "medium",
      thinkingLevel: "low",
      pollen: "feature-doc.md",
    });
    expect(takeItAwayWorkflow.steps.map((step: any) => step.id)).toEqual([
      "create-feature-doc",
      "start-implementation-doc-loop",
    ]);

    expect(featureDocWorkflow).toMatchObject({
      id: "feature-doc",
      clearOnStart: false,
      cleanupOnCompletion: false,
      model: "medium",
      thinkingLevel: "medium",
      pollen: "feature-doc.md",
    });
    expect(featureDocWorkflow.steps).toEqual([
      {
        id: "create-feature-doc",
        command: "/skill:feature-doc-create",
        outputs: ["feature-doc.md"],
      },
    ]);

    expect(implementationDocLoopWorkflow).toMatchObject({
      id: "implementation-doc-loop",
      userInvocable: false,
      modelInvocable: true,
      model: "medium",
      thinkingLevel: "low",
      pollen: "implementation-doc.md",
    });
    expect(implementationDocLoopWorkflow.steps.map((step: any) => step.id)).toEqual([
      "create-or-improve-implementation-doc",
      "review-implementation-doc",
      "route-implementation-doc-review",
    ]);
    expect(implementationDocLoopWorkflow.steps[0]).toMatchObject({
      command: "/skill:implementation-doc-create",
      model: "large",
      thinkingLevel: "high",
    });
    expect(implementationDocLoopWorkflow.steps[1]).toMatchObject({
      command: "/skill:implementation-doc-review",
      thinkingLevel: "medium",
    });
    expect(implementationDocLoopWorkflow.steps[2]).toMatchObject({
      command: "/feature-workflow-route implementation-doc-review",
      thinkingLevel: "minimal",
    });

    expect(implementationStoriesSplitWorkflow).toMatchObject({
      id: "implementation-stories-split",
      userInvocable: false,
      modelInvocable: true,
      model: "medium",
      thinkingLevel: "low",
    });
    expect(implementationStoriesSplitWorkflow.steps[0]).toMatchObject({
      command: "/skill:implementation-stories-split",
      thinkingLevel: "medium",
    });
    expect(implementationStoriesSplitWorkflow.steps[1]).toMatchObject({
      command: "/feature-workflow-route stories",
      thinkingLevel: "minimal",
    });
    expect(storyImplementationLoopWorkflow).toMatchObject({
      id: "story-implementation-loop",
      userInvocable: false,
      modelInvocable: true,
      model: "medium",
      thinkingLevel: "low",
    });
    expect(storyImplementationLoopWorkflow.steps[0]).toMatchObject({
      command: "/skill:story-implement",
      thinkingLevel: "medium",
    });
    expect(storyImplementationLoopWorkflow.steps[1]).toMatchObject({
      command: "/skill:story-implementation-review",
      thinkingLevel: "medium",
    });
    expect(storyImplementationLoopWorkflow.steps[2]).toMatchObject({
      command: "/feature-workflow-route story-review",
      thinkingLevel: "minimal",
    });
  });

  it("registers visible workflow commands and hides private loop commands", async () => {
    const { default: registerFeatureWorkflow } = await loadFeatureWorkflow();
    const pi = createPiHarness();

    registerFeatureWorkflow(pi);

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:new-feature"]).toBeDefined();
    expect(pi.commands["wf:take-it-away"]).toBeDefined();
    expect(pi.commands["wf:feature-doc"]).toBeDefined();
    expect(pi.commands["wf:implementation-doc-loop"]).toBeUndefined();
    expect(pi.commands["wf:implementation-stories-split"]).toBeUndefined();
    expect(pi.commands["wf:story-implementation-loop"]).toBeUndefined();
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
    expect(pi.commands["wf:feature-doc"]).toBeDefined();
  });

  it("loads feature workflow private skills during extension setup", async () => {
    const { default: registerFeatureWorkflow } = await loadFeatureWorkflow();
    const pi = createPiHarness();

    expect(findPrivateSkill("feature-grill")).toBeUndefined();

    registerFeatureWorkflow(pi);

    expect(findPrivateSkill("feature-grill")).toMatchObject({
      name: "feature-grill",
      description: expect.stringContaining("clarifies"),
    });
    expect(findPrivateSkill("feature-doc-create")).toBeDefined();
    expect(findPrivateSkill("implementation-doc-create")).toBeDefined();
    expect(findPrivateSkill("implementation-doc-review")).toBeDefined();
    expect(findPrivateSkill("implementation-stories-split")).toBeDefined();
    expect(findPrivateSkill("story-implement")).toBeDefined();
    expect(findPrivateSkill("story-implementation-review")).toBeDefined();

    const privateSkillCount = listPrivateSkills().length;
    registerFeatureWorkflow(pi);

    expect(listPrivateSkills()).toHaveLength(privateSkillCount);
  });

  it("routes story reviews from flat score fallback state for recovery", async () => {
    const { default: registerFeatureWorkflow } = await loadFeatureWorkflow();
    const pi = createPiHarness();
    const dir = await mkdtemp(join(tmpdir(), "feature-workflow-"));
    const gardenPath = join(dir, ".workflower", "workflows", "story-garden");

    try {
      registerFeatureWorkflow(pi);
      await mkdir(gardenPath, { recursive: true });
      await writeFile(
        join(gardenPath, "state.json"),
        `${JSON.stringify(
          {
            version: 1,
            values: {
              currentStoryIndex: { value: 0, updatedAt: "2026-06-24T00:00:00.000Z" },
              storyManifest: {
                value: {
                  stories: [
                    {
                      id: "001",
                      title: "First story",
                      path: join(dir, "story.md"),
                      dependencies: [],
                      status: "ready",
                    },
                  ],
                },
                updatedAt: "2026-06-24T00:00:00.000Z",
              },
              "storyReview.score": { value: "2/5 — Fail", updatedAt: "2026-06-24T00:00:00.000Z" },
              "storyReview.summary": {
                value: "Production implementation is missing.",
                updatedAt: "2026-06-24T00:00:00.000Z",
              },
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      await expect(
        routeFeatureWorkflow("story-review", {
          workflowId: "story-implementation-loop",
          workflowName: "story-garden",
          stepId: "route-story-review",
          gardenName: "story-garden",
          cwd: dir,
        }),
      ).resolves.toContain("Story implementation review score 2 is below 4.");

      await expect(readFile(join(gardenPath, "state.json"), "utf8")).resolves.toContain(
        '"storyReviewAttempts"',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("documents the redesigned loop architecture and garden state routing", async () => {
    const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

    expect(readme).toContain("implementation-doc-loop");
    expect(readme).toContain("implementation-stories-split");
    expect(readme).toContain("story-implementation-loop");
    expect(readme).toContain("workflower_handoff");
    expect(readme).toContain("implementationDocReviewAttempts");
    expect(readme).toContain("storyReviewAttempts");
    expect(readme).toContain("featureDocPath");
    expect(readme).toContain("score >= 4");
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
