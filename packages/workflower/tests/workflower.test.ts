import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveActiveStatePath } from "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-paths";
import {
  readActiveWorkflowState,
  writeActiveWorkflowState,
} from "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store";
import { resolveWorkflowPaths } from "../extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/artifact-paths";
import { removeGardenStateFile } from "../extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/remove-artifacts";
import { resolveGardenStatePath } from "../extension-src/workflower/internals/workflow-orchestration/runtime/garden-state/garden-state-paths";
import {
  getGardenStateValue as getStoredGardenStateValue,
  listGardenStateValues as listStoredGardenStateValues,
  readGardenStateFile,
  setGardenStateValue as setStoredGardenStateValue,
} from "../extension-src/workflower/internals/workflow-orchestration/runtime/garden-state/garden-state-store";
import { getGardenStateValue as getActiveGardenStateValue } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/garden-state/get-garden-state-value";
import { listGardenStateValues as listActiveGardenStateValues } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/garden-state/list-garden-state-values";
import { setGardenStateValue as setActiveGardenStateValue } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/garden-state/set-garden-state-value";
import { loadPackageWorkflowerSkills } from "../extension-src/workflower/internals/pi-adapter/private-skills/load-package-workflower-skills";
import { renderWorkflowerPromptMessageText } from "../extension-src/workflower/internals/pi-adapter/rendering/register-workflower-prompt-renderer";
import { expandPrivateSkillCommand } from "../extension-src/workflower/internals/workflow-orchestration/prompting/private-skills/expand-private-skill-command";
import {
  createStepPromptDisplay,
  createWorkflowPromptDisplay,
} from "../extension-src/workflower/internals/workflow-orchestration/prompting/workflow-prompt-display";
import { renderStepKickoffPrompt } from "../extension-src/workflower/internals/workflow-orchestration/prompting/step-kickoff/render-step-kickoff-prompt";
import {
  addWorkflowerCommandToRegistry,
  clearWorkflowerCommandsForTests,
  findWorkflowerCommand,
} from "../extension-src/workflower/internals/workflow-orchestration/definitions/private-commands/private-command-registry";
import { parseWorkflowerPrivateCommandInvocation } from "../extension-src/workflower/internals/workflow-orchestration/definitions/private-commands/parse-private-command-invocation";
import { resolveWorkflowerStepCommand } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/resolve-workflow-step-command";
import { startWorkflowStep } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/start-workflow-step";
import {
  clearPrivateSkillsForTests,
  findPrivateSkill,
  registerPrivateSkill,
} from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/private-skills/private-skill-registry";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

async function loadWorkflower(): Promise<Record<string, any>> {
  return import("../extension-src/workflower/index");
}

beforeAll(async () => {
  const { registerWorkflow } = await loadWorkflower();

  try {
    registerWorkflow({
      id: "feature",
      steps: [
        { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
        { id: "plan-issues", command: "/feature-plan-issues", outputs: ["issues.md"] },
        { id: "review-issues", command: "/feature-review-issues", outputs: ["reviewed-issues.md"] },
        { id: "create-github-issues", command: "/github-create-issues" },
      ],
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Workflow id already registered: feature")
    ) {
      throw error;
    }
  }
}, 30_000);

describe("package smoke", () => {
  it("loads a Pi extension entry point and public workflow API", async () => {
    const workflower = await loadWorkflower();

    expect(typeof workflower.default).toBe("function");
    expect(typeof workflower.registerWorkflow).toBe("function");
    expect(typeof workflower.registerWorkflowerCommand).toBe("function");
    expect(typeof workflower.createWorkflowerRuntime).toBe("function");
    expect(workflower.defineWorkflow).toBeUndefined();
    expect(workflower.findWorkflow).toBeUndefined();
    expect(workflower.listWorkflows).toBeUndefined();
    expect(workflower.advanceWorkflow).toBeUndefined();
    expect(workflower.startWorkflow).toBeUndefined();
    expect(workflower.resolveWorkflowPaths).toBeUndefined();
    expect(workflower.readActiveWorkflowState).toBeUndefined();
    expect(workflower.writeActiveWorkflowState).toBeUndefined();
    expect(workflower.renderStepKickoffPrompt).toBeUndefined();
  });

  it("uses the public module as the Pi extension entry so external registration shares one registry", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    );

    expect(manifest.pi.extensions).toEqual(["./dist/index.mjs"]);
  });

  it("documents garden state, runtime API, compact display, and slash command limitations", async () => {
    const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
    const authoringSkill = await readFile(
      new URL("../../workflower-authoring/skills/workflower-authoring/SKILL.md", import.meta.url),
      "utf8",
    );

    expect(readme).toContain("createWorkflowerRuntime");
    expect(readme).toContain("workflower_state_set");
    expect(readme).toContain("/wf state set review.rating 4");
    expect(readme).toContain("Outputs vs pollen vs garden state");
    expect(readme).toContain("Workflow prompt display");
    expect(readme).toContain("full kickoff prompt still enters model context");
    expect(readme).toContain("It is not a token-saving feature");
    expect(readme).toContain("private skill text is not visible in chat");
    expect(readme).toContain(
      "Assistant messages that print `/wf:<id>`, `/next`, or other slash commands do not execute",
    );
    expect(readme).toContain("workflower_handoff");
    expect(readme).toContain(
      "/wf:<workflow-id> <garden-name> | <workflow-id> [| <workflow-id>...]",
    );
    expect(readme).toContain("queued workflow targets must be user-invocable");
    expect(readme).toContain("Queued pipeline segments are workflow ids only");
    expect(readme).toContain("/wf resume <garden-name>");
    expect(readme).toContain("/wf resume <garden-name> --step <step-id|index>");
    expect(readme).toContain("zero-based");
    expect(readme).toContain("pointer override");
    expect(readme).toContain("does not prune");
    expect(readme).toContain("resume.json");
    expect(readme).toContain("--step=<value>");
    expect(readme).toContain("auto-next advances only after clean agent completion");
    expect(readme).toContain("3 total attempts");
    expect(authoringSkill).toContain("garden state");
    expect(authoringSkill).toContain("deterministic routing");
    expect(authoringSkill).toContain("Use output files for large artifacts");
    expect(authoringSkill).toContain(
      "Do not rely on visible transcript content to verify full private skill injection",
    );
  });
});

describe("workflower private skills", () => {
  beforeEach(() => {
    clearPrivateSkillsForTests();
  });

  it("loads workflower private skills from a package manifest", async () => {
    const privatePackage = await createPrivateSkillPackage(
      `---\ndescription: Private helper skill\n---\n# Private\n`,
    );

    try {
      const result = loadPackageWorkflowerSkills(privatePackage.packageUrl);

      expect(result.skills.map((skill) => skill.name)).toEqual(["private-one"]);
      expect(result.skills[0]).toMatchObject({
        description: "Private helper skill",
        filePath: privatePackage.skillPath,
        baseDir: join(privatePackage.dir, "skills", "private-one"),
      });
      expect(result.diagnostics).toEqual([]);
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("uses frontmatter name when loading a private skill", async () => {
    const privatePackage = await createPrivateSkillPackage(
      `---\nname: manifest-name\ndescription: Named private skill\n---\n# Private\n`,
    );

    try {
      const result = loadPackageWorkflowerSkills(privatePackage.packageUrl);

      expect(result.skills.map((skill) => skill.name)).toEqual(["manifest-name"]);
      expect(result.diagnostics).toEqual([]);
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("falls back to the skill directory name when no private skill name is set", async () => {
    const privatePackage = await createPrivateSkillPackage(
      `---\ndescription: Fallback skill\n---\n`,
    );

    try {
      const result = loadPackageWorkflowerSkills(privatePackage.packageUrl);

      expect(result.skills.map((skill) => skill.name)).toEqual(["private-one"]);
      expect(result.diagnostics).toEqual([]);
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("reports a diagnostic for private skills without descriptions", async () => {
    const privatePackage = await createPrivateSkillPackage(`---\nname: missing-description\n---\n`);

    try {
      const result = loadPackageWorkflowerSkills(privatePackage.packageUrl);

      expect(result.skills).toEqual([]);
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          level: "error",
          message: expect.stringContaining("missing a description"),
          path: privatePackage.skillPath,
        }),
      ]);
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("registers package private skills when setupWorkflower receives packageUrl", async () => {
    const { default: setupWorkflower } = await loadWorkflower();
    const privatePackage = await createPrivateSkillPackage(
      `---\ndescription: Registered skill\n---\n`,
    );
    const pi = createPiHarness();

    try {
      setupWorkflower(pi, { packageUrl: privatePackage.packageUrl });

      expect(findPrivateSkill("private-one")).toMatchObject({
        name: "private-one",
        description: "Registered skill",
        filePath: privatePackage.skillPath,
      });
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("does not require packageUrl for existing setupWorkflower callers", async () => {
    const { default: setupWorkflower } = await loadWorkflower();
    const pi = createPiHarness();

    setupWorkflower(pi);

    expect(pi.commands.wf).toBeDefined();
    expect(findPrivateSkill("private-one")).toBeUndefined();
  });

  it("expands a private skill command into a skill block", async () => {
    const privatePackage = await createPrivateSkillPackage(
      `---\ndescription: Private helper skill\n---\n# Body\n`,
    );

    try {
      registerPrivateSkill({
        name: "private-one",
        description: "Private helper skill",
        filePath: privatePackage.skillPath,
        baseDir: dirname(privatePackage.skillPath),
      });

      const expanded = expandPrivateSkillCommand("/skill:private-one extra args");

      expect(expanded).toContain('<skill name="private-one"');
      expect(expanded).toContain(`location="${privatePackage.skillPath}"`);
      expect(expanded).toContain("References are relative to");
      expect(expanded).toContain("# Body");
      expect(expanded).not.toContain("description: Private helper skill");
      expect(expanded).toContain("extra args");
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("returns undefined when expanding an unknown private skill command", () => {
    expect(expandPrivateSkillCommand("/skill:public-skill args")).toBeUndefined();
  });

  it("injects private skill content into the step kickoff prompt", async () => {
    const privatePackage = await createPrivateSkillPackage(
      `---\ndescription: Private helper skill\n---\n# Body\n`,
    );

    try {
      registerPrivateSkill({
        name: "private-one",
        description: "Private helper skill",
        filePath: privatePackage.skillPath,
        baseDir: dirname(privatePackage.skillPath),
      });

      const prompt = renderStepKickoffPrompt({
        id: "private-workflow",
        name: "demo",
        workdir: join("/repo", ".workflower", "workflows", "private-workflow", "demo"),
        step: { id: "run-private", command: "/skill:private-one extra args" },
        currentStepIndex: 0,
      });

      expect(prompt).toContain(
        "Execute this Workflower private skill for the current workflow step:",
      );
      expect(prompt).toContain('<skill name="private-one"');
      expect(prompt).toContain("# Body");
      expect(prompt).toContain("extra args");
      expect(prompt).not.toContain("Execute this command: /skill:private-one");
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("keeps private skill expansion in model content while rendering a compact workflow prompt", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const privatePackage = await createPrivateSkillPackage(
      `---\ndescription: Private helper skill\n---\n# Private Skill Body\nDo not show this body in the TUI.\n`,
    );
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerPrivateSkill({
        name: "private-one",
        description: "Private helper skill",
        filePath: privatePackage.skillPath,
        baseDir: dirname(privatePackage.skillPath),
      });
      registerWorkflow({
        id: "private-skill-display-demo",
        steps: [{ id: "run-private", command: "/skill:private-one extra args" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:private-skill-display-demo"].handler("private-skill-display", ctx);

      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].message).toMatchObject({
        customType: "workflower-prompt",
        display: true,
        details: {
          kind: "workflow",
          workflowId: "private-skill-display-demo",
          workflowName: "private-skill-display",
          label: "Workflow: private-skill-display-demo — private-skill-display",
        },
      });
      expect(prompts[0].prompt).toContain(
        "Execute this Workflower private skill for the current workflow step:",
      );
      expect(prompts[0].prompt).toContain('<skill name="private-one"');
      expect(prompts[0].prompt).toContain("# Private Skill Body");
      expect(prompts[0].prompt).toContain("Do not show this body in the TUI.");
      expect(prompts[0].prompt).toContain("extra args");

      const renderedText = pi.messageRenderers["workflower-prompt"](
        prompts[0].message,
        { expanded: true },
        {},
      )
        .render(120)
        .join("\n");
      expect(renderedText).toContain(
        "Workflow: private-skill-display-demo — private-skill-display",
      );
      expect(renderedText).not.toContain("Private Skill Body");
      expect(renderedText).not.toContain("Do not show this body in the TUI.");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("leaves non-private step commands unchanged", () => {
    const prompt = renderStepKickoffPrompt({
      id: "feature",
      name: "release-notes",
      workdir: join("/repo", ".workflower", "workflows", "feature", "release-notes"),
      step: { id: "discover", command: "/feature-discovery" },
      currentStepIndex: 0,
    });

    expect(prompt).toContain("Execute this command: /feature-discovery.");
    expect(prompt).not.toContain("Execute this Workflower private skill");
  });
});

describe("workflower private commands", () => {
  beforeEach(() => {
    clearWorkflowerCommandsForTests();
    clearPrivateSkillsForTests();
  });

  it("registers and finds a workflower private command", async () => {
    const { registerWorkflowerCommand } = await loadWorkflower();

    registerWorkflowerCommand({
      name: "feature:prepare-draft",
      handler: () => ({ kind: "none" }),
    });

    expect(findWorkflowerCommand("feature:prepare-draft")).toBeDefined();
  });

  it("does not silently replace a different private command with the same name", () => {
    const first = {
      name: "feature:prepare-draft",
      handler: () => ({ kind: "none" as const }),
    };
    const second = {
      name: "feature:prepare-draft",
      handler: () => ({ kind: "none" as const }),
    };

    expect(addWorkflowerCommandToRegistry(first)).toBeUndefined();
    expect(addWorkflowerCommandToRegistry(second)).toMatchObject({
      level: "warning",
      commandName: "feature:prepare-draft",
    });
    expect(findWorkflowerCommand("feature:prepare-draft")).toBe(first);
  });

  it("parses a workflower private command invocation", () => {
    expect(parseWorkflowerPrivateCommandInvocation("/feature:prepare-draft --strict")).toEqual({
      name: "feature:prepare-draft",
      args: "--strict",
    });
    expect(parseWorkflowerPrivateCommandInvocation("/skill:private-one args")).toBeUndefined();
    expect(parseWorkflowerPrivateCommandInvocation("not-a-command")).toBeUndefined();
  });

  it("executes a private command referenced by a workflow step", async () => {
    const seen: any[] = [];
    addWorkflowerCommandToRegistry({
      name: "feature:prepare-draft",
      handler: (args, ctx) => {
        seen.push({ args, ctx });
        return { kind: "prompt", content: "Private command prompt content." };
      },
    });

    const result = await resolveWorkflowerStepCommand(
      { id: "draft", command: "/feature:prepare-draft --strict" },
      {
        workflowId: "feature",
        workflowName: "release-notes",
        gardenName: "release-notes",
        cwd: "/repo",
      },
    );

    expect(result).toEqual({
      kind: "private-command-prompt",
      content: "Private command prompt content.",
    });
    expect(seen).toEqual([
      {
        args: "--strict",
        ctx: {
          workflowId: "feature",
          workflowName: "release-notes",
          gardenName: "release-notes",
          cwd: "/repo",
          stepId: "draft",
        },
      },
    ]);
  });

  it("injects a private command prompt when a workflow step starts", async () => {
    const {
      default: registerWorkflower,
      registerWorkflow,
      registerWorkflowerCommand,
    } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflowerCommand({
        name: "feature:prepare-draft",
        handler: (args: string, commandCtx: any) => ({
          kind: "prompt",
          content: `Private command prompt content for ${commandCtx.stepId} with ${args} in ${commandCtx.cwd}.`,
        }),
      });
      registerWorkflow({
        id: "private-command-step-demo",
        steps: [{ id: "draft", command: "/feature:prepare-draft --strict" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:private-command-step-demo"].handler("private-command", ctx);

      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts[0].message).toMatchObject({
        customType: "workflower-prompt",
        display: true,
        details: {
          kind: "workflow",
          workflowId: "private-command-step-demo",
          workflowName: "private-command",
          label: "Workflow: private-command-step-demo — private-command",
        },
      });
      expect(prompts[0].prompt).toContain(
        "Execute this Workflower private command for the current workflow step:",
      );
      expect(prompts[0].prompt).toContain(
        `Private command prompt content for draft with --strict in ${dir}.`,
      );
      expect(prompts[0].prompt).not.toContain("Execute this command: /feature:prepare-draft");

      const renderedText = pi.messageRenderers["workflower-prompt"](
        prompts[0].message,
        { expanded: true },
        {},
      )
        .render(120)
        .join("\n");
      expect(renderedText).toContain("Workflow: private-command-step-demo — private-command");
      expect(renderedText).not.toContain("Private command prompt content for draft");
      expect(renderedText).not.toContain("Execute this Workflower private command");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("omits command-specific prompt content when a private command returns none", async () => {
    const {
      default: registerWorkflower,
      registerWorkflow,
      registerWorkflowerCommand,
    } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflowerCommand({
        name: "feature:prepare-none",
        handler: () => ({ kind: "none" }),
      });
      registerWorkflow({
        id: "private-command-none-step-demo",
        steps: [{ id: "draft", command: "/feature:prepare-none --strict" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:private-command-none-step-demo"].handler("private-command-none", ctx);

      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts[0].prompt).toContain("Start this Workflower workflow step.");
      expect(prompts[0].prompt).not.toContain(
        "Execute this Workflower private command for the current workflow step:",
      );
      expect(prompts[0].prompt).not.toContain(
        "Execute this command: /feature:prepare-none --strict",
      );
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("leaves public or unknown commands as normal command text", async () => {
    const commandResolution = await resolveWorkflowerStepCommand(
      { id: "draft", command: "/some-public-command args" },
      {
        workflowId: "feature",
        workflowName: "release-notes",
        gardenName: "release-notes",
        cwd: "/repo",
      },
    );

    const prompt = renderStepKickoffPrompt({
      id: "feature",
      name: "release-notes",
      workdir: join("/repo", ".workflower", "workflows", "feature", "release-notes"),
      step: { id: "draft", command: "/some-public-command args" },
      currentStepIndex: 0,
      commandResolution,
    });

    expect(commandResolution).toBeUndefined();
    expect(prompt).toContain("Execute this command: /some-public-command args.");
    expect(prompt).not.toContain("Execute this Workflower private command");
  });

  it("prioritizes private skill expansion for /skill commands", async () => {
    const privatePackage = await createPrivateSkillPackage(
      `---\ndescription: Private helper skill\n---\n# Private Skill Body\n`,
    );
    const privateCommandHandler = vi.fn(() => ({
      kind: "prompt" as const,
      content: "Private command should not run.",
    }));

    try {
      registerPrivateSkill({
        name: "private-one",
        description: "Private helper skill",
        filePath: privatePackage.skillPath,
        baseDir: dirname(privatePackage.skillPath),
      });
      addWorkflowerCommandToRegistry({
        name: "skill:private-one",
        handler: privateCommandHandler,
      });

      const commandResolution = await resolveWorkflowerStepCommand(
        { id: "draft", command: "/skill:private-one extra args" },
        {
          workflowId: "feature",
          workflowName: "release-notes",
          gardenName: "release-notes",
          cwd: "/repo",
        },
      );
      const prompt = renderStepKickoffPrompt({
        id: "feature",
        name: "release-notes",
        workdir: join("/repo", ".workflower", "workflows", "feature", "release-notes"),
        step: { id: "draft", command: "/skill:private-one extra args" },
        currentStepIndex: 0,
        commandResolution,
      });

      expect(commandResolution).toMatchObject({ kind: "private-skill-prompt" });
      expect(privateCommandHandler).not.toHaveBeenCalled();
      expect(prompt).toContain(
        "Execute this Workflower private skill for the current workflow step:",
      );
      expect(prompt).toContain("# Private Skill Body");
      expect(prompt).toContain("extra args");
      expect(prompt).not.toContain("Private command should not run.");
      expect(prompt).not.toContain("Execute this command: /skill:private-one extra args");
    } finally {
      await rm(privatePackage.dir, { recursive: true, force: true });
    }
  });

  it("does not register private commands with Pi", async () => {
    const { default: registerWorkflower, registerWorkflowerCommand } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflowerCommand({
      name: "feature:prepare-draft",
      description: "Prepare a draft",
      handler: () => ({ kind: "none" }),
    });
    registerWorkflower(pi);

    expect(pi.commands["feature:prepare-draft"]).toBeUndefined();
    expect(pi.registeredCommands).not.toContain("feature:prepare-draft");
  });

  it("does not consume unknown private command invocations", async () => {
    await expect(
      resolveWorkflowerStepCommand(
        { id: "draft", command: "/feature:unknown --strict" },
        {
          workflowId: "feature",
          workflowName: "release-notes",
          gardenName: "release-notes",
          cwd: "/repo",
        },
      ),
    ).resolves.toBeUndefined();
  });
});

describe("workflow definitions and registry", () => {
  it.each(["feature", "github_issue", "review-pr"])(
    "supports folder-safe workflow id %s through generated start commands",
    async (workflowId) => {
      const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
      const pi = createPiHarness();

      if (workflowId !== "feature") {
        expect(
          registerWorkflow({
            id: workflowId,
            steps: [{ id: "first", command: "/demo", outputs: ["demo.md"] }],
          }),
        ).toBeUndefined();
      }

      registerWorkflower(pi);
      expect(pi.commands[`wf:${workflowId}`].description).toMatch(
        new RegExp(`Start Workflower workflow ${workflowId}`),
      );
    },
  );

  it("rejects duplicate workflow ids because they create duplicate /wf commands", async () => {
    const { registerWorkflow } = await loadWorkflower();
    registerWorkflow({
      id: "duplicate-demo",
      steps: [{ id: "first", command: "/demo" }],
    });

    expect(() =>
      registerWorkflow({
        id: "duplicate-demo",
        steps: [{ id: "first", command: "/demo" }],
      }),
    ).toThrow(/Workflow id already registered: duplicate-demo/);
  });

  it.each(["github:issue", "Feature", "has space", "../bad", ""])(
    "rejects unsafe workflow id %j",
    async (workflowId) => {
      const { registerWorkflow } = await loadWorkflower();

      expect(() =>
        registerWorkflow({
          id: workflowId,
          steps: [{ id: "first", command: "/demo" }],
        }),
      ).toThrow(/Invalid workflow id/);
    },
  );
});

describe("workflow prompt display", () => {
  it("creates a workflow label with only a workflow id", () => {
    expect(createWorkflowPromptDisplay({ workflowId: "take-it-away" })).toMatchObject({
      kind: "workflow",
      workflowId: "take-it-away",
      label: "Workflow: take-it-away",
    });
  });

  it("creates a workflow label with a user-provided workflow name", () => {
    expect(
      createWorkflowPromptDisplay({ workflowId: "take-it-away", workflowName: "my-feature-name" }),
    ).toMatchObject({
      kind: "workflow",
      workflowId: "take-it-away",
      workflowName: "my-feature-name",
      label: "Workflow: take-it-away — my-feature-name",
    });
  });

  it("creates a step label", () => {
    expect(
      createStepPromptDisplay({
        workflowId: "take-it-away",
        workflowName: "my-feature-name",
        stepId: "summarize-context",
        stepIndex: 1,
      }),
    ).toEqual({
      kind: "step",
      workflowId: "take-it-away",
      workflowName: "my-feature-name",
      stepId: "summarize-context",
      stepIndex: 1,
      label: "Step: summarize-context",
    });
  });

  it("renders workflower prompts as compact TUI labels without exposing the prompt body", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();
    const longPrivatePrompt = [
      "Execute this Workflower private skill for the current workflow step:",
      "# Long private skill body",
      "Do not show this full prompt in the TUI renderer.",
    ].join("\n");

    registerWorkflower(pi);

    expect(pi.messageRenderers["workflower-prompt"]).toBeDefined();
    const component = pi.messageRenderers["workflower-prompt"](
      {
        role: "custom",
        customType: "workflower-prompt",
        content: longPrivatePrompt,
        display: true,
        details: createStepPromptDisplay({
          workflowId: "take-it-away",
          workflowName: "my-feature-name",
          stepId: "summarize-context",
          stepIndex: 1,
        }),
        timestamp: Date.now(),
      },
      { expanded: false },
      {},
    );
    const renderedText = component.render(120).join("\n");

    expect(renderedText).toContain("Step: summarize-context");
    expect(renderedText).not.toContain("Long private skill body");
    expect(renderedText).not.toContain("Execute this Workflower private skill");
    expect(renderWorkflowerPromptMessageText({ details: undefined })).toBe("Workflower prompt");
  });
});

describe("paths, state, and prompts", () => {
  it("generates workdir and active-state paths under .workflower", async () => {
    const paths = resolveWorkflowPaths("/repo", "feature", "release-notes");

    expect(paths.gardenPath).toBe(join("/repo", ".workflower", "workflows", "release-notes"));
    expect(paths.flowerName).toBe("0001-feature");
    expect(paths.flowerPath).toBe(
      join("/repo", ".workflower", "workflows", "release-notes", "0001-feature"),
    );
    expect(paths.workdir).toBe(
      join("/repo", ".workflower", "workflows", "release-notes", "0001-feature"),
    );
    expect(resolveActiveStatePath("/repo", "session-id")).toBe(activeStatePath("/repo"));
  });

  it("writes and reads durable active state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const state = {
      sessionId: "session-id",
      id: "feature",
      name: "release-notes",
      workdir: join(dir, ".workflower", "workflows", "feature", "release-notes"),
      currentStepIndex: 0,
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };

    try {
      await writeActiveWorkflowState(activeStatePath(dir), state);

      await expect(readFile(join(dir, ".workflower", ".gitignore"), "utf8")).resolves.toBe("*\n");
      await expect(readFile(activeStatePath(dir), "utf8")).resolves.toContain('"id": "feature"');
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toEqual(state);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("renders a deterministic step-0 kickoff prompt with output paths resolved to the workdir", async () => {
    const prompt = renderStepKickoffPrompt({
      id: "feature",
      name: "release-notes",
      workdir: join("/repo", ".workflower", "workflows", "feature", "release-notes"),
      step: { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
      currentStepIndex: 0,
    });

    expect(prompt).toContain("Workflow: feature");
    expect(prompt).toContain("Name: release-notes");
    expect(prompt).toContain(
      `Workdir: ${join("/repo", ".workflower", "workflows", "feature", "release-notes")}`,
    );
    expect(prompt).toContain("Current step 0: discover");
    expect(prompt).toContain("Execute this command: /feature-discovery.");
    expect(prompt).toContain(
      join("/repo", ".workflower", "workflows", "feature", "release-notes", "feature.md"),
    );
  });

  it("omits manual next instructions for autoNext kickoff prompts", async () => {
    const prompt = renderStepKickoffPrompt({
      id: "custom",
      name: "demo",
      workdir: join("/repo", ".workflower", "workflows", "custom", "demo"),
      step: { id: "first", command: "/first", outputs: ["first.md"], autoNext: true },
      currentStepIndex: 0,
    });

    expect(prompt).toContain("Execute this command: /first.");
    expect(prompt).not.toContain("After the user verifies this step's outputs, use /next");
  });

  it("sends workflow prompt display metadata when the prompt sender supports it", async () => {
    const workflow = {
      id: "compact-display",
      steps: [{ id: "summarize-context", command: "/summarize" }],
    };
    const state = {
      sessionId: "session-id",
      id: workflow.id,
      name: "my-feature-name",
      workdir: join("/repo", ".workflower", "workflows", "my-feature-name", "0001-compact-display"),
      currentStepIndex: 0,
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };
    const expectedPrompt = renderStepKickoffPrompt({
      id: workflow.id,
      name: state.name,
      workdir: state.workdir,
      step: workflow.steps[0],
      currentStepIndex: 0,
    });
    const sentWorkflowPrompts: Array<{
      prompt: string;
      display: ReturnType<typeof createStepPromptDisplay>;
    }> = [];
    const sendUserMessage = vi.fn((_prompt: string) => undefined);
    const sendWorkflowPrompt = vi.fn(
      (input: { prompt: string; display: ReturnType<typeof createStepPromptDisplay> }) => {
        sentWorkflowPrompts.push(input);
      },
    );

    await expect(
      startWorkflowStep(
        workflow,
        state,
        0,
        { sendUserMessage, sendWorkflowPrompt },
        { cwd: "/repo" },
      ),
    ).resolves.toBe(true);

    expect(sendUserMessage).not.toHaveBeenCalled();
    expect(sendWorkflowPrompt).toHaveBeenCalledTimes(1);
    expect(sentWorkflowPrompts[0]).toEqual({
      prompt: expectedPrompt,
      display: {
        kind: "step",
        workflowId: "compact-display",
        workflowName: "my-feature-name",
        stepId: "summarize-context",
        stepIndex: 0,
        label: "Step: summarize-context",
      },
    });
    expect(sentWorkflowPrompts[0]?.prompt).toContain("Current step 0: summarize-context");
  });

  it("falls back to plain user messages for prompt senders without display support", async () => {
    const workflow = {
      id: "legacy-display",
      steps: [{ id: "discover", command: "/discover" }],
    };
    const state = {
      sessionId: "session-id",
      id: workflow.id,
      name: "legacy-feature-name",
      workdir: join(
        "/repo",
        ".workflower",
        "workflows",
        "legacy-feature-name",
        "0001-legacy-display",
      ),
      currentStepIndex: 0,
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };
    const expectedPrompt = renderStepKickoffPrompt({
      id: workflow.id,
      name: state.name,
      workdir: state.workdir,
      step: workflow.steps[0],
      currentStepIndex: 0,
    });
    const sendUserMessage = vi.fn((_prompt: string) => undefined);

    await expect(
      startWorkflowStep(workflow, state, 0, { sendUserMessage }, { cwd: "/repo" }),
    ).resolves.toBe(true);

    expect(sendUserMessage).toHaveBeenCalledTimes(1);
    expect(sendUserMessage).toHaveBeenCalledWith(expectedPrompt);
  });
});

describe("garden state foundations", () => {
  it("resolves the garden state path under the garden directory", () => {
    expect(resolveGardenStatePath(join("/repo", ".workflower", "workflows", "demo"))).toBe(
      join("/repo", ".workflower", "workflows", "demo", "state.json"),
    );
  });

  it("reads a missing garden state file as empty state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    try {
      await expect(
        readGardenStateFile(join(dir, ".workflower", "workflows", "demo")),
      ).resolves.toEqual({
        version: 1,
        values: {},
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes, reads, and lists garden state values as pretty JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const gardenPath = join(dir, ".workflower", "workflows", "demo");

    try {
      await setStoredGardenStateValue(gardenPath, "review.summary", "Needs tests");
      await setStoredGardenStateValue(gardenPath, "review.rating", 4);
      await setStoredGardenStateValue(gardenPath, "review.required_changes", ["Add tests"]);

      await expect(getStoredGardenStateValue(gardenPath, "review.rating")).resolves.toMatchObject({
        value: 4,
      });
      await expect(
        getStoredGardenStateValue(gardenPath, "review.required_changes"),
      ).resolves.toMatchObject({ value: ["Add tests"] });
      await expect(listStoredGardenStateValues(gardenPath).then(Object.keys)).resolves.toEqual([
        "review.rating",
        "review.required_changes",
        "review.summary",
      ]);
      await expect(readFile(resolveGardenStatePath(gardenPath), "utf8")).resolves.toContain(
        '  "version": 1,',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("removes only garden state files from workflow gardens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const gardenPath = join(dir, ".workflower", "workflows", "demo");
    const artifactPath = join(gardenPath, "artifact.md");
    const outsidePath = join(dir, "outside");
    const outsideStatePath = join(outsidePath, "state.json");

    try {
      await mkdir(gardenPath, { recursive: true });
      await mkdir(outsidePath, { recursive: true });
      await writeFile(resolveGardenStatePath(gardenPath), "{}", "utf8");
      await writeFile(artifactPath, "artifact", "utf8");
      await writeFile(outsideStatePath, "{}", "utf8");

      await removeGardenStateFile(dir, gardenPath);
      await expect(access(resolveGardenStatePath(gardenPath))).rejects.toThrow();
      await expect(readFile(artifactPath, "utf8")).resolves.toBe("artifact");
      await expect(removeGardenStateFile(dir, gardenPath)).resolves.toBeUndefined();
      await expect(removeGardenStateFile(dir, outsidePath)).rejects.toThrow(/Refusing to delete/);
      await expect(readFile(outsideStatePath, "utf8")).resolves.toBe("{}");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it.each(["", "../bad", "review/rating", "has space", "__proto__", "constructor", "prototype"])(
    "rejects invalid garden state key %j",
    async (key) => {
      await expect(
        setStoredGardenStateValue("/repo/.workflower/workflows/demo", key, true),
      ).rejects.toThrow(/Invalid garden state key/);
    },
  );

  it.each([undefined, Number.NaN, Infinity, () => undefined, Symbol("bad")])(
    "rejects JSON-incompatible garden state value %s",
    async (value) => {
      await expect(
        setStoredGardenStateValue("/repo/.workflower/workflows/demo", "review.rating", value),
      ).rejects.toThrow(/Invalid garden state value/);
    },
  );
});

describe("active-garden state use cases", () => {
  it("returns a friendly failure when no workflow is active for the session", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));

    try {
      await expect(
        getActiveGardenStateValue(createCommandContext(dir) as any, "review.rating"),
      ).resolves.toEqual({
        ok: false,
        message:
          "No active Workflower workflow. Garden state is only available inside an active garden.",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("sets active garden state using gardenPath and records active workflow producer metadata", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const gardenPath = join(dir, ".workflower", "workflows", "state-use-case");
    const flowerPath = join(gardenPath, "0001-feature");
    const ctx = createCommandContext(dir) as any;

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "state-use-case",
        gardenName: "state-use-case",
        gardenPath,
        activeFlowerName: "0001-feature",
        activeFlowerPath: flowerPath,
        workdir: flowerPath,
        currentStepIndex: 1,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      await expect(setActiveGardenStateValue(ctx, "review.rating", 4)).resolves.toMatchObject({
        ok: true,
        key: "review.rating",
        entry: {
          value: 4,
          producer: {
            workflowId: "feature",
            stepId: "plan-issues",
            stepIndex: 1,
            gardenName: "state-use-case",
            gardenPath,
            flowerName: "0001-feature",
            flowerPath,
          },
        },
      });
      await expect(readGardenStateFile(gardenPath)).resolves.toMatchObject({
        values: { "review.rating": { value: 4 } },
      });
      await expect(getActiveGardenStateValue(ctx, "missing.key")).resolves.toEqual({
        ok: true,
        key: "missing.key",
        found: false,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to the workdir parent when active state lacks modern garden fields", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const gardenPath = join(dir, ".workflower", "workflows", "legacy-state");
    const flowerPath = join(gardenPath, "0001-feature");
    const ctx = createCommandContext(dir) as any;

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "legacy-state",
        workdir: flowerPath,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      await expect(listActiveGardenStateValues(ctx)).resolves.toEqual({
        ok: true,
        values: {},
        keys: [],
      });
      await expect(setActiveGardenStateValue(ctx, "legacy.flag", true)).resolves.toMatchObject({
        ok: true,
        entry: {
          value: true,
          producer: {
            workflowId: "feature",
            stepId: "discover",
            stepIndex: 0,
            gardenName: "legacy-state",
            gardenPath,
            flowerName: "0001-feature",
            flowerPath,
          },
        },
      });
      await expect(readGardenStateFile(gardenPath)).resolves.toMatchObject({
        values: { "legacy.flag": { value: true } },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("garden state runtime, tools, and commands", () => {
  it("exposes a lightweight public runtime for active-garden state", async () => {
    const {
      createWorkflowerRuntime,
      default: registerWorkflower,
      registerWorkflow,
    } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "runtime-state-demo",
        steps: [{ id: "review", command: "/review" }],
      });
      registerWorkflower(pi);
      const runtime = createWorkflowerRuntime(pi, ctx);
      expect(pi.sentUserMessages).toEqual([]);

      await pi.commands["wf:runtime-state-demo"].handler("runtime-state", ctx);
      await expect(runtime.state.set("review.rating", 4)).resolves.toMatchObject({ ok: true });
      await expect(runtime.state.getValue("review.rating")).resolves.toBe(4);
      await expect(runtime.state.getValue("missing.key")).resolves.toBeUndefined();
      await expect(runtime.state.list()).resolves.toMatchObject({
        ok: true,
        keys: ["review.rating"],
      });

      const state = JSON.parse(
        await readFile(
          join(dir, ".workflower", "workflows", "runtime-state", "state.json"),
          "utf8",
        ),
      );
      expect(state.values["review.rating"].producer).toMatchObject({
        workflowId: "runtime-state-demo",
        stepId: "review",
        stepIndex: 0,
        gardenName: "runtime-state",
        flowerName: "0001-runtime-state-demo",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses the public runtime handoff facade with Pi custom messages by default", async () => {
    const {
      createWorkflowerRuntime,
      default: registerWorkflower,
      registerWorkflow,
    } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "runtime-default-handoff-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "runtime-default-handoff-target",
        steps: [{ id: "target", command: "/target" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:runtime-default-handoff-source"].handler("runtime-handoff", ctx);
      resetPiMessages(pi);

      const runtime = createWorkflowerRuntime(pi, ctx);
      await expect(runtime.handoff("runtime-default-handoff-target")).resolves.toMatchObject({
        ok: true,
        workflowId: "runtime-default-handoff-target",
      });

      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].message).toMatchObject({
        customType: "workflower-prompt",
        display: true,
        details: {
          kind: "workflow",
          workflowId: "runtime-default-handoff-target",
          workflowName: "runtime-handoff",
          label: "Workflow: runtime-default-handoff-target — runtime-handoff",
        },
      });
      expect(prompts[0].prompt).toContain("Workflow: runtime-default-handoff-target");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses the public runtime handoff facade and honors a custom sender", async () => {
    const {
      createWorkflowerRuntime,
      default: registerWorkflower,
      registerWorkflow,
    } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const sent: string[] = [];

    try {
      registerWorkflow({
        id: "runtime-handoff-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "runtime-handoff-target",
        steps: [{ id: "target", command: "/target" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:runtime-handoff-source"].handler("runtime-handoff", ctx);
      resetPiMessages(pi);

      const runtime = createWorkflowerRuntime(pi, ctx, {
        sendUserMessage: (prompt: string) => sent.push(prompt),
      });
      await expect(runtime.handoff("runtime-handoff-target")).resolves.toMatchObject({
        ok: true,
        workflowId: "runtime-handoff-target",
        activeFlowerName: "0002-runtime-handoff-target",
      });
      expect(sent).toHaveLength(1);
      expect(sent[0]).toContain("Workflow: runtime-handoff-target");
      expect(pi.sentUserMessages).toEqual([]);
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "runtime-handoff-target",
        activeFlowerName: "0002-runtime-handoff-target",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("registers and executes active-garden state tools", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({ id: "state-tool-demo", steps: [{ id: "review", command: "/review" }] });
      registerWorkflower(pi);
      expect(pi.tools.workflower_state_set.promptGuidelines.join("\n")).toContain(
        "workflower_state_get",
      );

      const missing = await executeStateSetTool(pi, "review.rating", 4, ctx);
      expect(missing.details).toMatchObject({ ok: false });

      await pi.commands["wf:state-tool-demo"].handler("state-tool", ctx);
      const set = await executeStateSetTool(pi, "review.rating", 4, ctx);
      expect(set.details).toMatchObject({ ok: true, key: "review.rating" });
      const get = await executeStateGetTool(pi, "review.rating", ctx);
      expect(get.details).toMatchObject({ ok: true, found: true, entry: { value: 4 } });
      const list = await executeStateListTool(pi, ctx);
      expect(list.details).toMatchObject({ ok: true, keys: ["review.rating"] });
      const invalid = await executeStateSetTool(pi, "review/rating", 4, ctx);
      expect(invalid.details).toMatchObject({ ok: false });
      expect(invalid.content[0].text).toContain("Invalid garden state key");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("supports /wf state list, get, and set commands", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({ id: "state-command-demo", steps: [{ id: "review", command: "/review" }] });
      registerWorkflower(pi);
      await pi.commands.wf.handler("state list", ctx);
      expect(ctx.notifications.at(-1)).toEqual([
        "No active Workflower workflow. Garden state is only available inside an active garden.",
        "error",
      ]);

      await pi.commands["wf:state-command-demo"].handler("state-command", ctx);
      await pi.commands.wf.handler("state list", ctx);
      expect(ctx.notifications.at(-1)).toEqual(["No garden state keys are set.", "info"]);
      await pi.commands.wf.handler("state set review.rating 4", ctx);
      await pi.commands.wf.handler('state set review.summary "Needs tests"', ctx);
      await pi.commands.wf.handler('state set review.required_changes ["Add tests"]', ctx);
      await pi.commands.wf.handler("state get review.rating", ctx);
      expect(ctx.notifications.at(-1)).toEqual(["Garden state review.rating: 4", "info"]);
      await pi.commands.wf.handler("state get missing.key", ctx);
      expect(ctx.notifications.at(-1)).toEqual([
        "Garden state key missing.key is not set.",
        "info",
      ]);
      await pi.commands.wf.handler("state set review.rating not-json", ctx);
      expect(ctx.notifications.at(-1)?.[0]).toContain("Invalid JSON value");

      const state = JSON.parse(
        await readFile(
          join(dir, ".workflower", "workflows", "state-command", "state.json"),
          "utf8",
        ),
      );
      expect(state.values["review.rating"].value).toBe(4);
      expect(state.values["review.summary"].value).toBe("Needs tests");
      expect(state.values["review.required_changes"].value).toEqual(["Add tests"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("cleans inactive preserved gardens but refuses active gardens", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "clean-demo");

    try {
      registerWorkflow({ id: "clean-demo", steps: [{ id: "only", command: "/only" }] });
      registerWorkflower(pi);
      await mkdir(gardenPath, { recursive: true });
      await writeFile(join(gardenPath, "artifact.md"), "debug", "utf8");

      await pi.commands["wf:clean-demo"].handler("clean-demo", ctx);
      await pi.commands.wf.handler("clean clean-demo", ctx);
      expect(ctx.notifications.at(-1)?.[0]).toContain("Refusing to clean active garden clean-demo");
      await expect(access(gardenPath)).resolves.toBeUndefined();

      await pi.commands.wf.handler("stop", ctx);
      await pi.commands.wf.handler("clean clean-demo", ctx);
      expect(ctx.notifications.at(-1)).toEqual(["Removed Workflower garden clean-demo.", "info"]);
      await expect(access(gardenPath)).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("preserves garden state on stop and when cleanupOnCompletion is false", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const stoppedStatePath = join(dir, ".workflower", "workflows", "state-stop", "state.json");
    const completedStatePath = join(dir, ".workflower", "workflows", "state-cleanup", "state.json");

    try {
      registerWorkflow({
        id: "state-cleanup-demo",
        cleanupOnCompletion: false,
        clearOnCompletion: false,
        steps: [{ id: "only", command: "/only" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:state-cleanup-demo"].handler("state-stop", ctx);
      await pi.commands.wf.handler("state set review.rating 4", ctx);
      await expect(access(stoppedStatePath)).resolves.toBeUndefined();
      await pi.commands.wf.handler("stop", ctx);
      await expect(access(stoppedStatePath)).resolves.toBeUndefined();

      await pi.commands["wf:state-cleanup-demo"].handler("state-cleanup", ctx);
      await pi.commands.wf.handler("state set review.rating 5", ctx);
      await pi.commands.next.handler("", ctx);
      await expect(access(completedStatePath)).resolves.toBeUndefined();
      await expect(
        access(join(dir, ".workflower", "workflows", "state-cleanup", "0001-state-cleanup-demo")),
      ).resolves.toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("command registration", () => {
  it("registers the generated workflow command surface with handlers and descriptions", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);

    const commandNames = Object.keys(pi.commands).sort();
    expect(commandNames).toContain("next");
    expect(commandNames).toContain("wf");
    expect(commandNames).toContain("wf:feature");
    expect(commandNames).toContain("wf:github_issue");
    expect(commandNames).not.toContain("workflow");
    expect(commandNames).not.toContain("wf-start-current-step");
    expect(pi.commands["wf:missing"]).toBeUndefined();
    expect(pi.handlers.agent_end).toHaveLength(1);
    expect(pi.handlers.context).toHaveLength(1);
    expect(pi.tools.workflower_handoff).toBeDefined();
    expect(pi.tools.workflower_handoff.description).toMatch(/Hand off/);
    expect(pi.tools.workflower_state_get).toBeDefined();
    expect(pi.tools.workflower_state_set).toBeDefined();
    expect(pi.tools.workflower_state_list).toBeDefined();
    expect(pi.commands.wf.description).toMatch(/Inspect, resume, and stop Workflower workflows/);
    expect(typeof pi.commands.wf.handler).toBe("function");
    expect(pi.commands["wf:feature"].description).toMatch(/Start Workflower workflow feature/);
    expect(typeof pi.commands["wf:feature"].handler).toBe("function");
    expect(pi.commands.next.description).toMatch(/Advance the active Workflower workflow/);
    expect(typeof pi.commands.next.handler).toBe("function");
  });

  it("does not register /wf:<id> commands for user-hidden workflows", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflow({
      id: "hidden-start-demo",
      userInvocable: false,
      steps: [{ id: "first", command: "/hidden" }],
    });

    registerWorkflower(pi);

    expect(pi.commands["wf:hidden-start-demo"]).toBeUndefined();
  });

  it("registers /wf:<id> commands for workflows contributed after extension load", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);
    expect(pi.commands["wf:late-demo"]).toBeUndefined();

    registerWorkflow({
      id: "late-demo",
      steps: [{ id: "first", command: "/late" }],
    });

    expect(pi.commands["wf:late-demo"].description).toMatch(/Start Workflower workflow late-demo/);
    expect(typeof pi.commands["wf:late-demo"].handler).toBe("function");
  });

  it("does not register late /wf:<id> commands for user-hidden workflows", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);
    expect(pi.commands["wf:late-hidden-demo"]).toBeUndefined();

    registerWorkflow({
      id: "late-hidden-demo",
      userInvocable: false,
      steps: [{ id: "first", command: "/hidden" }],
    });

    expect(pi.commands["wf:late-hidden-demo"]).toBeUndefined();
  });

  it("blocks exact user-hidden workflow input before it reaches the model", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const pi = createPiHarness();
    const ctx = createCommandContext("/repo");

    registerWorkflow({
      id: "hidden-input-demo",
      userInvocable: false,
      steps: [{ id: "first", command: "/hidden" }],
    });
    registerWorkflower(pi);

    const result = await pi.handlers.input[0](
      { type: "input", text: "/wf:hidden-input-demo", source: "interactive" },
      ctx,
    );

    expect(result).toEqual({ action: "handled" });
    expect(ctx.notifications.at(-1)).toEqual([
      "Workflow hidden-input-demo is not user-invokable.",
      "error",
    ]);
  });

  it("sets up Workflower commands and events idempotently for the same Pi instance", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);
    const commandCountAfterFirstSetup = pi.registeredCommands.length;
    const toolCountAfterFirstSetup = pi.registeredTools.length;
    registerWorkflower(pi);

    expect(pi.registeredCommands).toHaveLength(commandCountAfterFirstSetup);
    expect(pi.registeredTools).toHaveLength(toolCountAfterFirstSetup);
    expect(pi.registeredCommands.filter((name) => name === "wf")).toHaveLength(1);
    expect(pi.registeredCommands.filter((name) => name === "next")).toHaveLength(1);
    expect(pi.handlers.agent_end).toHaveLength(1);
    expect(pi.handlers.context).toHaveLength(1);
    expect(pi.handlers.input).toHaveLength(1);
  });

  it("re-registers Workflower commands after Pi tears down a session and reuses the API object", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);
    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();

    pi.handlers.session_shutdown[0]({ type: "session_shutdown" }, createCommandContext("/repo"));
    pi.commands = {};
    pi.registeredCommands = [];
    pi.handlers = {};

    registerWorkflower(pi);

    expect(pi.commands.wf).toBeDefined();
    expect(pi.commands.next).toBeDefined();
    expect(pi.commands["wf:feature"]).toBeDefined();
    expect(pi.registeredCommands.filter((name) => name === "wf")).toHaveLength(1);
    expect(pi.registeredCommands.filter((name) => name === "next")).toHaveLength(1);
  });

  it("disposes generated workflow command listeners on Pi session shutdown", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);
    pi.handlers.session_shutdown[0]({ type: "session_shutdown" }, createCommandContext("/repo"));
    pi.commands = {};
    pi.registeredCommands = [];
    pi.handlers = {};

    registerWorkflow({
      id: "after-shutdown-listener-demo",
      steps: [{ id: "first", command: "/demo" }],
    });
    expect(pi.commands["wf:after-shutdown-listener-demo"]).toBeUndefined();

    registerWorkflower(pi);
    expect(pi.commands["wf:after-shutdown-listener-demo"]).toBeDefined();
  });

  it("lets multiple workflow packages initialize Workflower without duplicate runtime setup", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflow({ id: "package-a", steps: [{ id: "first", command: "/a" }] });
    registerWorkflower(pi);
    registerWorkflow({ id: "package-b", steps: [{ id: "first", command: "/b" }] });
    registerWorkflower(pi);

    expect(pi.commands["wf:package-a"]).toBeDefined();
    expect(pi.commands["wf:package-b"]).toBeDefined();
    expect(pi.registeredCommands.filter((name) => name === "wf")).toHaveLength(1);
    expect(pi.registeredCommands.filter((name) => name === "next")).toHaveLength(1);
    expect(pi.handlers.agent_end).toHaveLength(1);
    expect(pi.handlers.context).toHaveLength(1);
  });
});

describe("/wf status and stop", () => {
  it("reports when no workflow is active", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflower(pi);
      await pi.commands.wf.handler("status", ctx);

      expect(ctx.notifications.at(-1)).toEqual(["No active workflow.", "info"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("/next", () => {
  it("registers /next and reports when no workflow is active", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflower(pi);
      expect(typeof pi.commands.next.handler).toBe("function");

      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications.at(-1)).toEqual(["No active workflow.", "info"]);
      expect(ctx.newSession).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("shows active garden and flower details including the current step", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const gardenPath = join(dir, ".workflower", "workflows", "release-notes");
    const activeFlowerPath = join(gardenPath, "0001-feature");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "release-notes",
        gardenName: "release-notes",
        gardenPath,
        activeFlowerName: "0001-feature",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 1,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.wf.handler("status", ctx);

      const [message, level] = ctx.notifications.at(-1) ?? [];
      expect(level).toBe("info");
      expect(message).toContain("Active workflow: feature");
      expect(message).toContain("Garden: release-notes");
      expect(message).toContain(`Garden path: ${gardenPath}`);
      expect(message).toContain(`Active flower path: ${activeFlowerPath}`);
      expect(message).toContain("Current step 1: plan-issues");
      expect(message).toContain("Command: /feature-plan-issues");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("shows active status for user-hidden workflows", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const gardenPath = join(dir, ".workflower", "workflows", "hidden-status");
    const activeFlowerPath = join(gardenPath, "0001-hidden-status-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "hidden-status-demo",
        userInvocable: false,
        steps: [{ id: "private-step", command: "/private" }],
      });
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "hidden-status-demo",
        name: "hidden-status",
        gardenName: "hidden-status",
        gardenPath,
        activeFlowerName: "0001-hidden-status-demo",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.wf.handler("status", ctx);

      const [message, level] = ctx.notifications.at(-1) ?? [];
      expect(level).toBe("info");
      expect(message).toContain("Active workflow: hidden-status-demo");
      expect(message).toContain("Current step 0: private-step");
      expect(message).toContain("Command: /private");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports a missing workflow definition without mutating active state", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const state = {
      sessionId: "session-id",
      id: "missing-workflow",
      name: "demo",
      workdir: join(dir, ".workflower", "workflows", "feature", "demo"),
      currentStepIndex: 0,
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      await writeActiveWorkflowState(statePath, state);
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(/Active workflow definition not found/);
      expect(ctx.notifications.at(-1)?.[1]).toBe("error");
      await expect(readFile(statePath, "utf8")).resolves.toBe(
        `${JSON.stringify(state, null, 2)}\n`,
      );
      expect(ctx.newSession).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports active state that references a missing workflow definition", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const activeFlowerPath = join(
      dir,
      ".workflower",
      "workflows",
      "release-notes",
      "0001-missing-workflow",
    );
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "missing-workflow",
        name: "release-notes",
        gardenName: "release-notes",
        gardenPath: join(dir, ".workflower", "workflows", "release-notes"),
        activeFlowerName: "0001-missing-workflow",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.wf.handler("status", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(
        /Active workflow references unknown workflow id: missing-workflow/,
      );
      expect(ctx.notifications.at(-1)?.[0]).toContain(`Active flower path: ${activeFlowerPath}`);
      expect(ctx.notifications.at(-1)?.[1]).toBe("warning");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports when stop is requested without an active workflow", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflower(pi);
      await pi.commands.wf.handler("stop", ctx);

      expect(ctx.notifications.at(-1)).toEqual(["No active workflow to stop.", "info"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clears active workflow state without deleting garden or flower artifacts", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "release-notes");
    const activeFlowerPath = join(gardenPath, "0001-feature");
    const artifactPath = join(activeFlowerPath, "feature.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "release-notes",
        gardenName: "release-notes",
        gardenPath,
        activeFlowerName: "0001-feature",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(artifactPath, "artifact", "utf8");

      registerWorkflower(pi);
      await pi.commands.wf.handler("stop", ctx);

      await expect(access(statePath)).rejects.toThrow();
      await expect(readFile(artifactPath, "utf8")).resolves.toBe("artifact");
      await expect(access(gardenPath)).resolves.toBeUndefined();
      await expect(access(activeFlowerPath)).resolves.toBeUndefined();
      expect(ctx.notifications.at(-1)).toEqual([
        "Stopped workflow feature in garden release-notes. Garden and flower artifacts were not deleted.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("stop leaves a garden resumable and marks metadata paused", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "paused-demo");
    const resumePath = join(gardenPath, "resume.json");
    const gardenStatePath = resolveGardenStatePath(gardenPath);

    try {
      registerWorkflow({ id: "pause-resume-demo", steps: [{ id: "first", command: "/first" }] });
      registerWorkflower(pi);

      await pi.commands["wf:pause-resume-demo"].handler("paused-demo", ctx);
      await pi.commands.wf.handler("state set review.rating 4", ctx);
      const activeResumeBeforeStop = await readResumeState(resumePath);
      const activeFlowerPath = activeResumeBeforeStop.activeFlowerPath;

      await pi.commands.wf.handler("stop", ctx);

      await expect(access(activeStatePath(dir))).rejects.toThrow();
      await expect(access(activeFlowerPath)).resolves.toBeUndefined();
      await expect(readFile(gardenStatePath, "utf8").then(JSON.parse)).resolves.toMatchObject({
        values: { "review.rating": { value: 4 } },
      });
      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        status: "paused",
        workflowId: "pause-resume-demo",
        gardenName: "paused-demo",
        activeFlowerPath,
      });
      expect((await readResumeState(resumePath)).updatedAt).not.toBe(
        activeResumeBeforeStop.updatedAt,
      );

      const resumeCtx = createCommandContext(dir, {
        sessionManager: createSessionManager(dir, "resumed-session"),
      });
      await pi.commands.wf.handler("resume paused-demo", resumeCtx);

      await expect(
        readActiveWorkflowState(activeStatePath(dir, "resumed-session")),
      ).resolves.toMatchObject({
        id: "pause-resume-demo",
        gardenName: "paused-demo",
        sessionId: "resumed-session",
      });
      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        status: "active",
        sessionId: "resumed-session",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("lists current-session and stale workflow states by garden and flower", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const currentFlowerPath = join(dir, ".workflower", "workflows", "current", "0001-feature");
    const staleFlowerPath = join(dir, ".workflower", "workflows", "stale-garden", "0002-feature");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "current",
        gardenName: "current",
        gardenPath: join(dir, ".workflower", "workflows", "current"),
        activeFlowerName: "0001-feature",
        activeFlowerPath: currentFlowerPath,
        workdir: currentFlowerPath,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await writeActiveWorkflowState(activeStatePath(dir, "other-session"), {
        sessionId: "other-session",
        id: "feature",
        name: "stale",
        gardenName: "stale-garden",
        gardenPath: join(dir, ".workflower", "workflows", "stale-garden"),
        activeFlowerName: "0002-feature",
        activeFlowerPath: staleFlowerPath,
        workdir: staleFlowerPath,
        currentStepIndex: 1,
        startedAt: "2026-01-02T04:05:06.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.wf.handler("list", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toContain(
        "feature in garden current step 0 - current session",
      );
      expect(ctx.notifications.at(-1)?.[0]).toContain(`Active flower path: ${currentFlowerPath}`);
      expect(ctx.notifications.at(-1)?.[0]).toContain(
        "feature in garden stale-garden step 1 - stale/other session",
      );
      expect(ctx.notifications.at(-1)?.[0]).toContain(`Active flower path: ${staleFlowerPath}`);
      expect(ctx.notifications.at(-1)?.[1]).toBe("info");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports helpful unknown workflow subcommands", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();
    const ctx = createCommandContext("/repo");

    registerWorkflower(pi);
    await pi.commands.wf.handler("frobnicate", ctx);

    expect(ctx.notifications.at(-1)?.[0]).toMatch(
      /Unknown wf command: frobnicate\. Available commands: status, stop, list, clean, state, resume, config\./,
    );
    expect(ctx.notifications.at(-1)?.[1]).toBe("error");
  });
});

describe("/next", () => {
  it("registers /next and reports when no workflow is active", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflower(pi);
      expect(typeof pi.commands.next.handler).toBe("function");

      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications.at(-1)).toEqual(["No active workflow.", "info"]);
      expect(ctx.newSession).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("advances directly and sends a follow-up kickoff after an autoNext step agent run ends", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "demo");
    const activeFlowerPath = join(gardenPath, "0001-auto-next-demo");
    const staleWorkdir = join(dir, ".workflower", "workflows", "auto-next-demo", "demo");
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true, outputs: ["first.md"] },
          { id: "second", command: "/second", outputs: ["second.md"] },
        ],
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(
        join(activeFlowerPath, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "auto-next-demo", flowerPath: activeFlowerPath, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-demo",
        name: "demo",
        gardenName: "demo",
        gardenPath,
        activeFlowerName: "0001-auto-next-demo",
        activeFlowerPath,
        workdir: staleWorkdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        createCommandContext(dir),
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        contextBoundaryEntryId: "leaf-id",
      });
      await expect(
        readFile(join(activeFlowerPath, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [join(activeFlowerPath, "first.md")],
        pollenPinned: false,
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 1: second");
      expect(prompts[0].prompt).toContain(join(activeFlowerPath, "second.md"));
      expect(prompts[0].prompt).not.toContain(join(staleWorkdir, "second.md"));
      expect(prompts[0].prompt).not.toBe("/next");
      expect(prompts[0].options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clears autoNext retry state after a clean retry advances", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "clean-retry-demo");
    const activeFlowerPath = join(gardenPath, "0001-auto-next-clean-retry-demo");
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-clean-retry-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true, outputs: ["first.md"] },
          { id: "second", command: "/second" },
        ],
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(
        join(activeFlowerPath, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "auto-next-clean-retry-demo", flowerPath: activeFlowerPath, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-clean-retry-demo",
        name: "clean-retry-demo",
        gardenName: "clean-retry-demo",
        gardenPath,
        activeFlowerName: "0001-auto-next-clean-retry-demo",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 0,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 1,
          lastErrorMessage: "previous timeout",
          exhausted: false,
          updatedAt: "2026-01-02T03:04:05.000Z",
        },
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        createCommandContext(dir),
      );

      const nextState = await readActiveWorkflowState(statePath);
      expect(nextState.currentStepIndex).toBe(1);
      expect(nextState).not.toHaveProperty("autoNextFailure");
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain("Current step 1: second");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not carry autoNext retry state across manual next advancement", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(
      dir,
      ".workflower",
      "workflows",
      "manual-retry-demo",
      "0001-manual-retry-demo",
    );
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "manual-retry-demo",
        steps: [
          { id: "first", command: "/first", outputs: ["first.md"] },
          { id: "second", command: "/second" },
        ],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "manual-retry-demo",
        name: "manual-retry-demo",
        workdir,
        currentStepIndex: 0,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 1,
          lastErrorMessage: "previous timeout",
          exhausted: false,
          updatedAt: "2026-01-02T03:04:05.000Z",
        },
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      const nextState = await readActiveWorkflowState(statePath);
      expect(nextState.currentStepIndex).toBe(1);
      expect(nextState).not.toHaveProperty("autoNextFailure");
      expect(ctx.notifications).toContainEqual([
        "Advanced workflow manual-retry-demo to step 1.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("retries the same autoNext step after an execution error while attempts remain", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "error-demo");
    const activeFlowerPath = join(gardenPath, "0001-auto-next-error-demo");
    const staleWorkdir = join(dir, ".workflower", "workflows", "error-demo", "stale-workdir");
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-error-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true, outputs: ["first.md"] },
          { id: "second", command: "/second", outputs: ["second.md"] },
        ],
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(
        join(activeFlowerPath, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "auto-next-error-demo", flowerPath: activeFlowerPath, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-error-demo",
        name: "error-demo",
        gardenName: "error-demo",
        gardenPath,
        activeFlowerName: "0001-auto-next-error-demo",
        activeFlowerPath,
        workdir: staleWorkdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        {
          type: "agent_end",
          messages: [assistantMessageWithStopReason("error", { errorMessage: "timeout" })],
        },
        createCommandContext(dir),
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 0,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 1,
          lastErrorMessage: "timeout",
          exhausted: false,
        },
      });
      await expect(
        readFile(join(activeFlowerPath, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [],
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 0: first");
      expect(prompts[0].prompt).toContain(activeFlowerPath);
      expect(prompts[0].prompt).not.toContain(staleWorkdir);
      expect(prompts[0].prompt).toContain(
        "Retrying this same step because the previous auto-next attempt ended with an execution error: timeout",
      );
      expect(prompts[0].prompt).not.toContain("Current step 1: second");
      expect(prompts[0].options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("starts retry attempts at 1 when a later autoNext step fails after earlier retry state", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "next-step-error-demo");
    const activeFlowerPath = join(gardenPath, "0001-auto-next-step-error-demo");
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-step-error-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true },
          { id: "second", command: "/second", autoNext: true },
        ],
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(
        join(activeFlowerPath, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "auto-next-step-error-demo", flowerPath: activeFlowerPath, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-step-error-demo",
        name: "next-step-error-demo",
        gardenName: "next-step-error-demo",
        gardenPath,
        activeFlowerName: "0001-auto-next-step-error-demo",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 1,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 2,
          lastErrorMessage: "previous step timeout",
          exhausted: false,
          updatedAt: "2026-01-02T03:04:05.000Z",
        },
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        {
          type: "agent_end",
          messages: [assistantMessageWithStopReason("error", { errorMessage: "second failed" })],
        },
        createCommandContext(dir),
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        autoNextFailure: {
          stepIndex: 1,
          attempts: 1,
          lastErrorMessage: "second failed",
          exhausted: false,
        },
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 1: second");
      expect(prompts[0].prompt).toContain(
        "Retrying this same step because the previous auto-next attempt ended with an execution error: second failed",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("stops retrying autoNext execution errors after three total attempts", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "exhaustion-demo");
    const activeFlowerPath = join(gardenPath, "0001-auto-next-exhaustion-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "auto-next-exhaustion-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true, outputs: ["first.md"] },
          { id: "second", command: "/second", outputs: ["second.md"] },
        ],
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(
        join(activeFlowerPath, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "auto-next-exhaustion-demo", flowerPath: activeFlowerPath, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-exhaustion-demo",
        name: "exhaustion-demo",
        gardenName: "exhaustion-demo",
        gardenPath,
        activeFlowerName: "0001-auto-next-exhaustion-demo",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 0,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 2,
          lastErrorMessage: "previous timeout",
          exhausted: false,
          updatedAt: "2026-01-02T03:04:05.000Z",
        },
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        {
          type: "agent_end",
          messages: [assistantMessageWithStopReason("error", { errorMessage: "timeout" })],
        },
        ctx,
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 0,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 3,
          lastErrorMessage: "timeout",
          exhausted: true,
        },
      });
      await expect(
        readFile(join(activeFlowerPath, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [],
      });
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
      expect(pi.sentUserMessages).toEqual([]);
      expect(ctx.notifications.at(-1)?.[0]).toContain("failed after 3 execution-error attempts");
      expect(ctx.notifications.at(-1)?.[0]).toContain("remains on step 0");
      expect(ctx.notifications.at(-1)?.[1]).toBe("error");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not advance autoNext when the agent run ends with an abort", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-aborted-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true },
          { id: "second", command: "/second" },
        ],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-aborted-demo",
        name: "aborted-demo",
        workdir: join(
          dir,
          ".workflower",
          "workflows",
          "aborted-demo",
          "0001-auto-next-aborted-demo",
        ),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        {
          type: "agent_end",
          messages: [assistantMessageWithStopReason("aborted")],
        },
        createCommandContext(dir),
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 0,
      });
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("retries the same autoNext step when the agent run outcome cannot be determined", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-unknown-outcome-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true },
          { id: "second", command: "/second" },
        ],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-unknown-outcome-demo",
        name: "unknown-outcome-demo",
        workdir: join(
          dir,
          ".workflower",
          "workflows",
          "unknown-outcome-demo",
          "0001-auto-next-unknown-outcome-demo",
        ),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [] },
        createCommandContext(dir),
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 0,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 1,
          lastErrorMessage: "No assistant message was included in the agent_end event.",
          exhausted: false,
        },
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 0: first");
      expect(prompts[0].prompt).toContain(
        "Retrying this same step because the previous auto-next attempt ended without a confirmed clean result",
      );
      expect(prompts[0].prompt).not.toContain("Current step 1: second");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("auto-next honors clearOnNext false by preserving an existing boundary", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-no-clear-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true, clearOnNext: false },
          { id: "second", command: "/second" },
        ],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-next-no-clear-demo",
        name: "demo",
        workdir: join(dir, ".workflower", "workflows", "auto-next-no-clear-demo", "demo"),
        currentStepIndex: 0,
        contextBoundaryEntryId: "existing-boundary",
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        createCommandContext(dir),
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        contextBoundaryEntryId: "existing-boundary",
      });
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain("Current step 1: second");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not queue /next after non-autoNext step agent runs", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir: join(dir, ".workflower", "workflows", "feature", "demo"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0]({ type: "agent_end" }, createCommandContext(dir));

      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("filters context messages after the active workflow boundary", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        gardenName: "demo",
        gardenPath: join(dir, ".workflower", "workflows", "demo"),
        activeFlowerName: "0001-feature",
        activeFlowerPath: join(dir, ".workflower", "workflows", "demo", "0001-feature"),
        workdir: join(dir, ".workflower", "workflows", "demo", "0001-feature"),
        currentStepIndex: 0,
        contextBoundaryEntryId: "entry-c",
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      const result = await pi.handlers.context[0](
        { type: "context", messages: [] },
        createCommandContext(dir, {
          sessionManager: {
            getSessionId: () => "session-id",
            getSessionFile: () => join(dir, "session.jsonl"),
            getLeafId: () => "entry-e",
            getBranch: () => [
              messageEntry("entry-a", null, "user", "old user"),
              messageEntry("entry-b", "entry-a", "assistant", "old assistant"),
              messageEntry("entry-c", "entry-b", "user", "boundary"),
              messageEntry("entry-d", "entry-c", "user", "kickoff"),
              messageEntry("entry-e", "entry-d", "assistant", "response"),
            ],
          },
        }),
      );

      expect(result.messages.map((message: any) => message.content)).toEqual([
        "kickoff",
        "response",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not filter context messages when no boundary is present", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir: join(dir, ".workflower", "workflows", "feature", "demo"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);

      await expect(
        pi.handlers.context[0]({ type: "context", messages: [] }, createCommandContext(dir)),
      ).resolves.toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports usage and does not advance when /next receives unexpected arguments", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir: join(dir, ".workflower", "workflows", "feature", "demo"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      await pi.commands.next.handler("feature", ctx);

      expect(ctx.notifications.at(-1)).toEqual(["Usage: /next", "error"]);
      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 0,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("updates resume metadata on manual next and auto-next", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const resumePath = join(dir, ".workflower", "workflows", "resume-movement", "resume.json");

    try {
      registerWorkflow({
        id: "resume-movement-demo",
        steps: [
          { id: "manual", command: "/manual" },
          { id: "automatic", command: "/automatic", autoNext: true },
          { id: "done", command: "/done" },
        ],
      });
      registerWorkflower(pi);

      await pi.commands["wf:resume-movement-demo"].handler("resume-movement", ctx);
      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-movement-demo",
        activeFlowerName: "0001-resume-movement-demo",
        currentStepIndex: 0,
      });

      resetPiMessages(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-movement-demo",
        activeFlowerName: "0001-resume-movement-demo",
        currentStepIndex: 1,
        contextBoundaryEntryId: "leaf-id",
      });

      resetPiMessages(pi);
      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        ctx,
      );

      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-movement-demo",
        activeFlowerName: "0001-resume-movement-demo",
        currentStepIndex: 2,
        contextBoundaryEntryId: "leaf-id",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports resume metadata write failures during active pointer movement", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const resumePath = join(dir, ".workflower", "workflows", "resume-write-failure", "resume.json");

    try {
      registerWorkflow({
        id: "resume-write-failure-demo",
        steps: [
          { id: "first", command: "/first" },
          { id: "second", command: "/second" },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:resume-write-failure-demo"].handler("resume-write-failure", ctx);
      resetPiMessages(pi);
      await rm(resumePath, { force: true });
      await mkdir(resumePath);

      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(/Failed to update resume metadata/);
      expect(ctx.notifications.at(-1)?.[1]).toBe("error");
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports a missing workflow definition without mutating active state", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const state = {
      sessionId: "session-id",
      id: "missing-workflow",
      name: "demo",
      workdir: join(dir, ".workflower", "workflows", "missing-workflow", "demo"),
      currentStepIndex: 0,
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      await writeActiveWorkflowState(statePath, state);
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(/Active workflow definition not found/);
      expect(ctx.notifications.at(-1)?.[1]).toBe("error");
      await expect(readFile(statePath, "utf8")).resolves.toBe(
        `${JSON.stringify(state, null, 2)}\n`,
      );
      expect(ctx.newSession).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("advances in the current session when the completed step disables clearOnNext", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".workflower", "workflows", "same-session-demo", "same-session-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "same-session-demo",
        steps: [
          { id: "first", command: "/first", outputs: ["first.md"], clearOnNext: false },
          { id: "second", command: "/second", outputs: ["second.md"] },
        ],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "same-session-demo",
        name: "same-session-demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].display).toMatchObject({
        kind: "step",
        workflowId: "same-session-demo",
        workflowName: "same-session-demo",
        stepId: "second",
        stepIndex: 1,
        label: "Step: second",
      });
      expect(prompts[0].prompt).toContain("Current step 1: second");
      expect(prompts[0].prompt).toContain("Execute this command: /second.");
      expect(pi.sentUserMessages).toEqual([]);
      expect(ctx.notifications.at(-1)).toEqual([
        "Advanced workflow same-session-demo to step 1.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("updates unpinned flower pollen from each completed step output without checking file existence", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(
      dir,
      ".workflower",
      "workflows",
      "pollen-replace-demo",
      "pollen-replace-demo",
    );
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "pollen-replace-demo",
        steps: [
          { id: "first", command: "/first", outputs: ["first.md"] },
          { id: "second", command: "/second", outputs: ["second.md"] },
          { id: "third", command: "/third" },
        ],
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(
        join(workdir, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "pollen-replace-demo", flowerPath: workdir, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "pollen-replace-demo",
        name: "pollen-replace-demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);
      await expect(
        readFile(join(workdir, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [join(workdir, "first.md")],
        pollenPinned: false,
      });

      await pi.commands.next.handler("", ctx);
      await expect(
        readFile(join(workdir, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [join(workdir, "second.md")],
        pollenPinned: false,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("pins configured pollen and preserves it when a later completed step has outputs", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".workflower", "workflows", "pollen-pin-demo", "pollen-pin-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "pollen-pin-demo",
        pollen: "final.md",
        cleanupOnCompletion: false,
        clearOnCompletion: false,
        steps: [
          { id: "draft", command: "/draft", outputs: ["draft.md"] },
          { id: "final", command: "/final", outputs: ["final.md"] },
          { id: "later", command: "/later", outputs: ["later.md"] },
        ],
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(
        join(workdir, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "pollen-pin-demo", flowerPath: workdir, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "pollen-pin-demo",
        name: "pollen-pin-demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);
      await expect(
        readFile(join(workdir, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [join(workdir, "draft.md")],
        pollenPinned: false,
      });

      await pi.commands.next.handler("", ctx);
      await expect(
        readFile(join(workdir, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [join(workdir, "final.md")],
        pollenPinned: true,
      });

      await pi.commands.next.handler("", ctx);
      await expect(
        readFile(join(workdir, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [join(workdir, "final.md")],
        pollenPinned: true,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("pins all configured pollen paths together when an array pollen output is completed", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".workflower", "workflows", "pollen-array-demo", "pollen-array-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "pollen-array-demo",
        pollen: ["final.md", "notes.md"],
        steps: [
          { id: "final", command: "/final", outputs: ["final.md"] },
          { id: "done", command: "/done" },
        ],
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(
        join(workdir, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "pollen-array-demo", flowerPath: workdir, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "pollen-array-demo",
        name: "pollen-array-demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      await expect(
        readFile(join(workdir, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        pollen: [join(workdir, "final.md"), join(workdir, "notes.md")],
        pollenPinned: true,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("advances blindly to the next step and sends previous-output handoff in the current session with a boundary", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".workflower", "workflows", "feature", "demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications).toContainEqual(["Advanced workflow feature to step 1.", "info"]);
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        contextBoundaryEntryId: "leaf-id",
      });
      expect(ctx.newSession).not.toHaveBeenCalled();
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 1: plan-issues");
      expect(prompts[0].prompt).toContain("Execute this command: /feature-plan-issues.");
      expect(prompts[0].prompt).toContain("Previous step outputs:");
      expect(prompts[0].prompt).toContain(join(workdir, "feature.md"));
      expect(prompts[0].prompt).toContain("Expected outputs:");
      expect(prompts[0].prompt).toContain(join(workdir, "issues.md"));
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports a missing queued workflow definition at final-step handoff without completing the garden", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "missing-queued-handoff");
    const sourceFlower = join(gardenPath, "0001-missing-queued-source");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "missing-queued-source",
        steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
      });
      await mkdir(sourceFlower, { recursive: true });
      await writeFile(
        join(sourceFlower, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "missing-queued-source", flowerPath: sourceFlower, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "missing-queued-source",
        name: "missing-queued-handoff",
        gardenName: "missing-queued-handoff",
        gardenPath,
        activeFlowerName: "0001-missing-queued-source",
        activeFlowerPath: sourceFlower,
        workdir: sourceFlower,
        currentStepIndex: 0,
        queuedWorkflowIds: ["missing-queued-target"],
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);

      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications).toContainEqual([
        "Queued workflow definition not found: missing-queued-target.",
        "error",
      ]);
      expect(ctx.newSession).not.toHaveBeenCalled();
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "missing-queued-source",
        activeFlowerName: "0001-missing-queued-source",
        currentStepIndex: 0,
        queuedWorkflowIds: ["missing-queued-target"],
      });
      await expect(
        readFile(join(sourceFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "active",
        workflowId: "missing-queued-source",
      });
      await expect(access(join(gardenPath, "0002-missing-queued-target"))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clears active workflow state without deleting workflow artifacts", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "release-notes");
    const activeFlowerPath = join(gardenPath, "0001-feature");
    const artifactPath = join(activeFlowerPath, "feature.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "release-notes",
        gardenName: "release-notes",
        gardenPath,
        activeFlowerName: "0001-feature",
        activeFlowerPath,
        workdir: activeFlowerPath,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(artifactPath, "artifact", "utf8");

      registerWorkflower(pi);
      await pi.commands.wf.handler("stop", ctx);

      await expect(access(statePath)).rejects.toThrow();
      await expect(readFile(artifactPath, "utf8")).resolves.toBe("artifact");
      expect(ctx.notifications.at(-1)).toEqual([
        "Stopped workflow feature in garden release-notes. Garden and flower artifacts were not deleted.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clears active state, deletes workflow artifacts, and starts a fresh session at the end by default", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".workflower", "workflows", "feature", "demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const newSession = vi.spyOn(ctx, "newSession");

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir,
        currentStepIndex: 3,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await mkdir(join(workdir, "nested"), { recursive: true });
      await writeFile(join(workdir, "nested", "artifact.md"), "artifact", "utf8");
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(workdir)).rejects.toThrow();
      expect(ctx.notifications.at(-1)).toEqual(["Workflow feature complete.", "info"]);
      expect(newSession).toHaveBeenCalledOnce();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("removes a completed single-flower garden and clears active state by default", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "single-garden");
    const flowerPath = join(gardenPath, "0001-garden-single-completion-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "garden-single-completion-demo",
        steps: [{ id: "only", command: "/only", outputs: ["artifact.md"] }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:garden-single-completion-demo"].handler("single-garden", ctx);
      await writeFile(join(flowerPath, "artifact.md"), "artifact", "utf8");

      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(flowerPath)).rejects.toThrow();
      await expect(access(gardenPath)).rejects.toThrow();
      expect(ctx.notifications.at(-1)).toEqual([
        "Workflow garden-single-completion-demo complete.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("completion removes or terminally marks resume metadata based on cleanup settings", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const defaultResumePath = join(
      dir,
      ".workflower",
      "workflows",
      "resume-cleanup-default",
      "resume.json",
    );
    const preservedResumePath = join(
      dir,
      ".workflower",
      "workflows",
      "resume-cleanup-preserved",
      "resume.json",
    );

    try {
      registerWorkflow({
        id: "resume-cleanup-default-demo",
        steps: [{ id: "only", command: "/only" }],
      });
      registerWorkflow({
        id: "resume-cleanup-preserved-demo",
        cleanupOnCompletion: false,
        steps: [{ id: "only", command: "/only" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:resume-cleanup-default-demo"].handler("resume-cleanup-default", ctx);
      await pi.commands.next.handler("", ctx);
      await expect(access(defaultResumePath)).rejects.toThrow();

      await pi.commands["wf:resume-cleanup-preserved-demo"].handler(
        "resume-cleanup-preserved",
        ctx,
      );
      await pi.commands.next.handler("", ctx);

      const completedResume = await readResumeState(preservedResumePath);
      expect(completedResume).toMatchObject({
        status: "completed",
        workflowId: "resume-cleanup-preserved-demo",
        gardenName: "resume-cleanup-preserved",
      });
      expect(completedResume.completedAt).toBeTruthy();

      const resumeCtx = createCommandContext(dir, {
        sessionManager: createSessionManager(dir, "completed-resume-session"),
      });
      await pi.commands.wf.handler("resume resume-cleanup-preserved", resumeCtx);
      expect(resumeCtx.notifications.at(-1)).toEqual([
        "Cannot resume garden resume-cleanup-preserved; resume metadata is completed and cannot be resumed.",
        "error",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("preserves handed-off flowers until final garden completion and then cleans up per workflow", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "mixed-garden");
    const firstFlower = join(gardenPath, "0001-garden-keep-source-demo");
    const secondFlower = join(gardenPath, "0002-garden-clean-target-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const newSession = vi.spyOn(ctx, "newSession");

    try {
      registerWorkflow({
        id: "garden-keep-source-demo",
        cleanupOnCompletion: false,
        clearOnStart: false,
        steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
      });
      registerWorkflow({
        id: "garden-clean-target-demo",
        clearOnStart: false,
        steps: [{ id: "target", command: "/target", outputs: ["target.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:garden-keep-source-demo"].handler("mixed-garden", ctx);
      await writeFile(join(firstFlower, "source.md"), "source", "utf8");
      await pi.commands["wf:garden-clean-target-demo"].handler("", ctx);

      await expect(access(firstFlower)).resolves.toBeUndefined();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "garden-clean-target-demo",
        activeFlowerPath: secondFlower,
      });
      await expect(
        readFile(join(firstFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
      });

      await writeFile(join(secondFlower, "target.md"), "target", "utf8");
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(firstFlower)).resolves.toBeUndefined();
      await expect(access(join(secondFlower, "target.md"))).rejects.toThrow();
      await expect(access(secondFlower)).rejects.toThrow();
      await expect(readdir(gardenPath)).resolves.toEqual(["0001-garden-keep-source-demo"]);
      await expect(readFile(join(firstFlower, "source.md"), "utf8")).resolves.toBe("source");
      await expect(
        readFile(join(firstFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "garden-keep-source-demo",
      });
      expect(newSession).toHaveBeenCalledOnce();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("marks the active flower completed before preserving it when cleanup is disabled", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const flowerPath = join(
      dir,
      ".workflower",
      "workflows",
      "completed-status-garden",
      "0001-garden-completed-status-demo",
    );
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "garden-completed-status-demo",
        cleanupOnCompletion: false,
        steps: [{ id: "only", command: "/only" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:garden-completed-status-demo"].handler("completed-status-garden", ctx);

      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(
        readFile(join(flowerPath, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "completed",
        workflowId: "garden-completed-status-demo",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("preserves workflow artifacts and garden state on completion when cleanupOnCompletion is false", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "keep-artifacts-demo");
    const workdir = join(gardenPath, "keep-artifacts-demo");
    const artifactPath = join(workdir, "artifact.md");
    const gardenStatePath = resolveGardenStatePath(gardenPath);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const newSession = vi.spyOn(ctx, "newSession");

    try {
      registerWorkflow({
        id: "keep-artifacts-demo",
        cleanupOnCompletion: false,
        steps: [{ id: "only", command: "/only", outputs: ["artifact.md"] }],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "keep-artifacts-demo",
        name: "keep-artifacts-demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(artifactPath, "artifact", "utf8");
      await writeFile(gardenStatePath, "{}", "utf8");
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(gardenStatePath)).resolves.toBeUndefined();
      await expect(readFile(artifactPath, "utf8")).resolves.toBe("artifact");
      expect(ctx.notifications.at(-1)).toEqual(["Workflow keep-artifacts-demo complete.", "info"]);
      expect(newSession).toHaveBeenCalledOnce();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("completes in the current session when clearOnCompletion is false", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(
      dir,
      ".workflower",
      "workflows",
      "same-session-completion-demo",
      "same-session-completion-demo",
    );
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "same-session-completion-demo",
        clearOnCompletion: false,
        steps: [{ id: "only", command: "/only" }],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "same-session-completion-demo",
        name: "same-session-completion-demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await mkdir(workdir, { recursive: true });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(workdir)).rejects.toThrow();
      expect(ctx.notifications.at(-1)).toEqual([
        "Workflow same-session-completion-demo complete.",
        "info",
      ]);
      expect(ctx.newSession).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("auto-next final steps hand off to queued workflows before completing", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "auto-pipe-demo");
    const sourceFlower = join(gardenPath, "0001-auto-pipe-source");
    const targetFlower = join(gardenPath, "0002-auto-pipe-target");
    const sourceOutput = join(sourceFlower, "source.md");
    const targetOutput = join(targetFlower, "target.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "auto-pipe-source",
        steps: [{ id: "source", command: "/source", outputs: ["source.md"], autoNext: true }],
      });
      registerWorkflow({
        id: "auto-pipe-target",
        steps: [{ id: "target", command: "/target", outputs: ["target.md"], autoNext: true }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:auto-pipe-source"].handler("auto-pipe-demo | auto-pipe-target", ctx);
      const sourceStateWithQueuedHandoff = await readActiveWorkflowState(statePath);
      await writeActiveWorkflowState(statePath, {
        ...sourceStateWithQueuedHandoff,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 2,
          lastErrorMessage: "previous source retry",
          exhausted: false,
          updatedAt: "2026-01-02T03:04:05.000Z",
        },
      });
      await writeFile(sourceOutput, "source pollen", "utf8");
      resetPiMessages(pi);

      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        ctx,
      );

      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "auto-pipe-target",
        gardenName: "auto-pipe-demo",
        gardenPath,
        activeFlowerName: "0002-auto-pipe-target",
        activeFlowerPath: targetFlower,
        currentStepIndex: 0,
      });
      const activeState = await readActiveWorkflowState(statePath);
      expect(activeState).not.toHaveProperty("queuedWorkflowIds");
      expect(activeState).not.toHaveProperty("autoNextFailure");
      await expect(
        readFile(join(sourceFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "auto-pipe-source",
        pollen: [sourceOutput],
      });
      await expect(
        readFile(join(targetFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "active",
        workflowId: "auto-pipe-target",
      });
      const handoffPrompts = sentWorkflowerPrompts(pi);
      expect(handoffPrompts).toHaveLength(1);
      expect(handoffPrompts[0].prompt).toContain("Workflow: auto-pipe-target");
      expect(handoffPrompts[0].prompt).toContain("Current step 0: target");
      expect(handoffPrompts[0].prompt).toContain("Incoming pollen paths:");
      expect(handoffPrompts[0].prompt).toContain(sourceOutput);
      expect(handoffPrompts[0].options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
      expect(ctx.notifications).not.toContainEqual([
        "Workflow auto-pipe-source complete. Completion ran from auto-next, so session context was not cleared automatically.",
        "info",
      ]);
      expect(ctx.notifications).toContainEqual([
        "Started workflow auto-pipe-target as next flower in auto-pipe-demo.",
        "info",
      ]);

      await writeFile(targetOutput, "target pollen", "utf8");
      resetPiMessages(pi);

      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        ctx,
      );

      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(gardenPath)).rejects.toThrow();
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
      expect(ctx.notifications.at(-1)).toEqual([
        "Workflow auto-pipe-target complete. Completion ran from auto-next, so session context was not cleared automatically.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to current-session completion when final-step auto-next completes", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "auto-complete-demo");
    const activeFlowerPath = join(gardenPath, "0001-auto-complete-demo");
    const staleWorkdir = join(dir, ".workflower", "workflows", "legacy-auto-complete-demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "auto-complete-demo",
        steps: [{ id: "only", command: "/only", autoNext: true }],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "auto-complete-demo",
        name: "auto-complete-demo",
        gardenName: "auto-complete-demo",
        gardenPath,
        activeFlowerName: "0001-auto-complete-demo",
        activeFlowerPath,
        workdir: staleWorkdir,
        currentStepIndex: 0,
        autoNextFailure: {
          stepIndex: 0,
          attempts: 2,
          lastErrorMessage: "previous final retry",
          exhausted: false,
          updatedAt: "2026-01-02T03:04:05.000Z",
        },
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await mkdir(activeFlowerPath, { recursive: true });
      await writeFile(
        join(activeFlowerPath, "index.json"),
        `${JSON.stringify({ status: "active", workflowId: "auto-complete-demo", flowerPath: activeFlowerPath, pollen: [], pollenPinned: false }, null, 2)}\n`,
        "utf8",
      );
      await writeFile(join(activeFlowerPath, "artifact.md"), "artifact", "utf8");
      registerWorkflower(pi);
      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        ctx,
      );

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(activeFlowerPath)).rejects.toThrow();
      await expect(access(gardenPath)).rejects.toThrow();
      expect(ctx.newSession).not.toHaveBeenCalled();
      expect(ctx.notifications.at(-1)).toEqual([
        "Workflow auto-complete-demo complete. Completion ran from auto-next, so session context was not cleared automatically.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports an error when completion session creation fails", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".workflower", "workflows", "feature", "demo");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, {
      newSession: async () => {
        throw new Error("boom");
      },
    });

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir,
        currentStepIndex: 3,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await mkdir(workdir, { recursive: true });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      expect(ctx.notifications.at(-1)).toEqual([
        "Failed to clear completed workflow session: boom",
        "error",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not create a new session for next-step advancement when session creation would be cancelled", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn(async () => ({ cancelled: true })) });

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir: join(dir, ".workflower", "workflows", "feature", "demo"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications.at(-1)).toEqual(["Advanced workflow feature to step 1.", "info"]);
      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        contextBoundaryEntryId: "leaf-id",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not create a new session for next-step advancement when session creation would fail", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(async () => {
        throw new Error("boom");
      }),
    });

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "demo",
        workdir: join(dir, ".workflower", "workflows", "feature", "demo"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications).toEqual([["Advanced workflow feature to step 1.", "info"]]);
      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        contextBoundaryEntryId: "leaf-id",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("workflower_handoff tool", () => {
  it("registers the workflower_handoff tool", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);

    expect(pi.tools.workflower_handoff).toBeDefined();
    expect(pi.tools.workflower_handoff.description).toMatch(/Hand off/);
  });

  it("fails when no active workflow exists", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();

    try {
      registerWorkflower(pi);
      const result = await executeHandoffTool(pi, "feature", createCommandContext(dir));

      expect(result.details).toMatchObject({ ok: false });
      expect(result.content[0].text).toContain("No active Workflower workflow");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fails for an unknown workflow id without mutating the active flower", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const firstFlower = join(
      dir,
      ".workflower",
      "workflows",
      "tool-unknown",
      "0001-handoff-tool-unknown-source",
    );

    try {
      registerWorkflow({
        id: "handoff-tool-unknown-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:handoff-tool-unknown-source"].handler("tool-unknown", ctx);
      resetPiMessages(pi);

      const result = await executeHandoffTool(pi, "missing-workflow", ctx);

      expect(result.details).toMatchObject({ ok: false });
      expect(result.content[0].text).toContain("Unknown workflow id: missing-workflow");
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "handoff-tool-unknown-source",
        activeFlowerName: "0001-handoff-tool-unknown-source",
      });
      await expect(access(firstFlower)).resolves.toBeUndefined();
      await expect(
        access(join(dir, ".workflower", "workflows", "tool-unknown", "0002-missing-workflow")),
      ).rejects.toThrow();
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("starts the target workflow as the next flower, preserving the active context boundary", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const firstFlower = join(
      dir,
      ".workflower",
      "workflows",
      "tool-demo",
      "0001-handoff-tool-source",
    );
    const secondFlower = join(
      dir,
      ".workflower",
      "workflows",
      "tool-demo",
      "0002-handoff-tool-target",
    );
    const pollenPath = join(firstFlower, "source.md");

    try {
      registerWorkflow({
        id: "handoff-tool-source",
        pollen: "source.md",
        steps: [
          { id: "source", command: "/source", outputs: ["source.md"] },
          { id: "decide", command: "/decide" },
        ],
      });
      registerWorkflow({
        id: "handoff-tool-target",
        clearOnStart: true,
        steps: [{ id: "target-step", command: "/target", outputs: ["target.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:handoff-tool-source"].handler("tool-demo", ctx);
      await pi.commands.next.handler("", ctx);
      resetPiMessages(pi);

      const result = await executeHandoffTool(pi, "handoff-tool-target", ctx);

      expect(result.details).toMatchObject({
        ok: true,
        workflowId: "handoff-tool-target",
        gardenName: "tool-demo",
        activeFlowerName: "0002-handoff-tool-target",
        activeFlowerPath: secondFlower,
        incomingPollen: [pollenPath],
      });
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "handoff-tool-target",
        gardenName: "tool-demo",
        activeFlowerName: "0002-handoff-tool-target",
        activeFlowerPath: secondFlower,
        workdir: secondFlower,
        currentStepIndex: 0,
        contextBoundaryEntryId: "leaf-id",
      });
      await expect(
        readFile(join(firstFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "handoff-tool-source",
        pollen: [pollenPath],
        pollenPinned: true,
      });
      await expect(
        readFile(join(secondFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "active",
        workflowId: "handoff-tool-target",
        pollen: [],
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
      expect(prompts[0].display).toMatchObject({
        kind: "workflow",
        workflowId: "handoff-tool-target",
        workflowName: "tool-demo",
        label: "Workflow: handoff-tool-target — tool-demo",
      });
      expect(prompts[0].prompt).toContain("Workflow: handoff-tool-target");
      expect(prompts[0].prompt).toContain("Current step 0: target-step");
      expect(prompts[0].prompt).toContain(`Workdir: ${secondFlower}`);
      expect(prompts[0].prompt).toContain("Incoming pollen paths:");
      expect(prompts[0].prompt).toContain(pollenPath);
      expect(pi.sentUserMessages).toEqual([]);

      const scopedContext = await pi.handlers.context[0](
        { type: "context", messages: [] },
        createCommandContext(dir, {
          sessionManager: {
            getSessionId: () => "session-id",
            getSessionFile: () => join(dir, "session.jsonl"),
            getLeafId: () => "target-kickoff",
            getBranch: () => [
              messageEntry("old-skill", null, "assistant", "old skill context before boundary"),
              messageEntry("leaf-id", "old-skill", "assistant", "boundary"),
              messageEntry("target-kickoff", "leaf-id", "user", "target kickoff"),
            ],
          },
        }),
      );
      expect(scopedContext.messages.map((message: any) => message.content)).toEqual([
        "target kickoff",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("allows model handoff to start a user-hidden workflow", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const secondFlower = join(
      dir,
      ".workflower",
      "workflows",
      "hidden-tool-demo",
      "0002-handoff-tool-user-hidden-target",
    );

    try {
      registerWorkflow({
        id: "handoff-tool-user-hidden-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "handoff-tool-user-hidden-target",
        userInvocable: false,
        steps: [{ id: "target", command: "/target" }],
      });
      registerWorkflower(pi);

      expect(pi.commands["wf:handoff-tool-user-hidden-target"]).toBeUndefined();
      await pi.commands["wf:handoff-tool-user-hidden-source"].handler("hidden-tool-demo", ctx);
      resetPiMessages(pi);

      const result = await executeHandoffTool(pi, "handoff-tool-user-hidden-target", ctx);

      expect(result.details).toMatchObject({
        ok: true,
        workflowId: "handoff-tool-user-hidden-target",
        activeFlowerName: "0002-handoff-tool-user-hidden-target",
      });
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "handoff-tool-user-hidden-target",
        activeFlowerPath: secondFlower,
      });
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain(
        "Workflow: handoff-tool-user-hidden-target",
      );
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects model handoff to a model-hidden workflow without mutating active state", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "handoff-tool-model-hidden-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "handoff-tool-model-hidden-target",
        modelInvocable: false,
        steps: [{ id: "target", command: "/target" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:handoff-tool-model-hidden-source"].handler(
        "model-hidden-tool-demo",
        ctx,
      );
      resetPiMessages(pi);

      const result = await executeHandoffTool(pi, "handoff-tool-model-hidden-target", ctx);

      expect(result.details).toMatchObject({ ok: false });
      expect(result.content[0].text).toContain(
        "Workflow handoff-tool-model-hidden-target is not model-invokable.",
      );
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "handoff-tool-model-hidden-source",
        activeFlowerName: "0001-handoff-tool-model-hidden-source",
      });
      await expect(
        access(
          join(
            dir,
            ".workflower",
            "workflows",
            "model-hidden-tool-demo",
            "0002-handoff-tool-model-hidden-target",
          ),
        ),
      ).rejects.toThrow();
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("suppresses source-step auto-next after a tool handoff but allows target-step auto-next", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const firstFlower = join(
      dir,
      ".workflower",
      "workflows",
      "auto-tool-demo",
      "0001-auto-handoff-tool-source",
    );
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "auto-handoff-tool-source",
        steps: [{ id: "handoff", command: "/skill:handoff", autoNext: true }],
      });
      registerWorkflow({
        id: "auto-handoff-tool-target",
        steps: [
          { id: "first", command: "/target-first", autoNext: true },
          { id: "second", command: "/target-second" },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:auto-handoff-tool-source"].handler("auto-tool-demo", ctx);
      resetPiMessages(pi);

      await executeHandoffTool(pi, "auto-handoff-tool-target", ctx);
      await pi.handlers.agent_end[0](
        { type: "agent_end", messages: [cleanAssistantMessage()] },
        ctx,
      );

      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "auto-handoff-tool-target",
        currentStepIndex: 1,
      });
      await expect(
        readFile(join(firstFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(2);
      expect(prompts[0].prompt).toContain("Current step 0: first");
      expect(prompts[1].prompt).toContain("Current step 1: second");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("prevents two handoffs in the same agent turn", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflow({
        id: "double-handoff-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "double-handoff-target-a",
        steps: [{ id: "first", command: "/first" }],
      });
      registerWorkflow({
        id: "double-handoff-target-b",
        steps: [{ id: "second", command: "/second" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:double-handoff-source"].handler("double-tool-demo", ctx);

      await executeHandoffTool(pi, "double-handoff-target-a", ctx);
      const secondResult = await executeHandoffTool(pi, "double-handoff-target-b", ctx);

      expect(secondResult.details).toMatchObject({ ok: false });
      expect(secondResult.content[0].text).toContain(
        "A Workflower handoff already occurred during this agent turn.",
      );
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "double-handoff-target-a",
        activeFlowerName: "0002-double-handoff-target-a",
      });
      await expect(
        access(
          join(dir, ".workflower", "workflows", "double-tool-demo", "0003-double-handoff-target-b"),
        ),
      ).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("/wf:<id>", () => {
  it("registers /wf:<id> and starts a known workflow in the current session with a boundary", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflower(pi);
      await pi.commands["wf:feature"].handler("release-notes", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      expect(ctx.notifications).toContainEqual([
        "Started workflow feature as release-notes.",
        "info",
      ]);
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "feature",
        gardenName: "release-notes",
        gardenPath: join(dir, ".workflower", "workflows", "release-notes"),
        activeFlowerName: "0001-feature",
        activeFlowerPath: join(dir, ".workflower", "workflows", "release-notes", "0001-feature"),
        currentStepIndex: 0,
        contextBoundaryEntryId: "leaf-id",
      });
      await expect(
        readFile(
          join(dir, ".workflower", "workflows", "release-notes", "0001-feature", "index.json"),
          "utf8",
        ).then(JSON.parse),
      ).resolves.toMatchObject({
        status: "active",
        workflowId: "feature",
        flowerPath: join(dir, ".workflower", "workflows", "release-notes", "0001-feature"),
        pollen: [],
        pollenPinned: false,
      });
      await expect(
        access(join(dir, ".workflower", "workflows", "release-notes", "index.json")),
      ).rejects.toThrow();
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].message).toMatchObject({
        customType: "workflower-prompt",
        display: true,
        details: {
          kind: "workflow",
          workflowId: "feature",
          workflowName: "release-notes",
          label: "Workflow: feature — release-notes",
        },
      });
      expect(prompts[0].options).toEqual({ triggerTurn: true });
      expect(prompts[0].prompt).not.toBe("/wf-start-current-step");
      expect(prompts[0].prompt).toContain("Execute this command: /feature-discovery.");
      expect(prompts[0].prompt).toContain(
        join(dir, ".workflower", "workflows", "release-notes", "0001-feature", "feature.md"),
      );
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("resumes a preserved garden after the current active state is missing", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({ id: "resume-tracer", steps: [{ id: "first", command: "/first" }] });
      registerWorkflower(pi);

      await pi.commands["wf:resume-tracer"].handler("resume-demo", ctx);

      const resumeState = JSON.parse(
        await readFile(join(dir, ".workflower", "workflows", "resume-demo", "resume.json"), "utf8"),
      );
      expect(resumeState).toMatchObject({
        version: 1,
        status: "active",
        sessionId: "session-id",
        sessionFile: join(dir, "session.jsonl"),
        workflowId: "resume-tracer",
        gardenName: "resume-demo",
        gardenPath: join(dir, ".workflower", "workflows", "resume-demo"),
        activeFlowerName: "0001-resume-tracer",
        activeFlowerPath: join(
          dir,
          ".workflower",
          "workflows",
          "resume-demo",
          "0001-resume-tracer",
        ),
        currentStepIndex: 0,
        startedAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(resumeState.startedAt).toBeTruthy();
      expect(resumeState.updatedAt).toBeTruthy();

      const resumeCtx = createCommandContext(dir, {
        sessionManager: createSessionManager(dir, "resumed-session"),
      });
      await rm(activeStatePath(dir), { force: true });
      await pi.commands.wf.handler("resume resume-demo", resumeCtx);

      await expect(
        readActiveWorkflowState(activeStatePath(dir, "resumed-session")),
      ).resolves.toMatchObject({
        id: "resume-tracer",
        name: "resume-demo",
        gardenName: "resume-demo",
        currentStepIndex: 0,
        sessionId: "resumed-session",
        sessionFile: join(dir, "resumed-session.jsonl"),
      });
      expect(sentWorkflowerPrompts(pi).at(-1)?.prompt).toContain("Current step 0: first");
      expect(resumeCtx.notifications).toContainEqual([
        "Resumed workflow resume-tracer in garden resume-demo at step 0 (first).",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("resumes at a zero-based step override and preserves later artifacts", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const gardenPath = join(dir, ".workflower", "workflows", "resume-step-index");
    const resumePath = join(gardenPath, "resume.json");
    const statePath = join(gardenPath, "state.json");
    const laterFlowerPath = join(gardenPath, "0002-later-flower");
    const laterFlowerFile = join(laterFlowerPath, "artifact.md");

    try {
      registerWorkflow({
        id: "resume-step-index-demo",
        steps: [
          { id: "first", command: "/first" },
          { id: "second", command: "/second" },
          { id: "third", command: "/third" },
        ],
      });
      registerWorkflower(pi);

      await pi.commands["wf:resume-step-index-demo"].handler("resume-step-index", ctx);
      await mkdir(laterFlowerPath, { recursive: true });
      await writeFile(laterFlowerFile, "later artifact bytes\n", "utf8");
      await writeFile(statePath, '{"story":"unchanged"}\n', "utf8");
      const laterFlowerBytesBefore = await readFile(laterFlowerFile, "utf8");
      const stateBytesBefore = await readFile(statePath, "utf8");
      await rm(activeStatePath(dir), { force: true });

      const resumeCtx = createCommandContext(dir, {
        sessionManager: createSessionManager(dir, "step-index-session"),
      });
      await pi.commands.wf.handler("resume resume-step-index --step 2", resumeCtx);

      await expect(
        readActiveWorkflowState(activeStatePath(dir, "step-index-session")),
      ).resolves.toMatchObject({
        id: "resume-step-index-demo",
        gardenName: "resume-step-index",
        currentStepIndex: 2,
        sessionId: "step-index-session",
      });
      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-step-index-demo",
        gardenName: "resume-step-index",
        currentStepIndex: 2,
        sessionId: "step-index-session",
        sessionFile: join(dir, "step-index-session.jsonl"),
      });
      expect(sentWorkflowerPrompts(pi).at(-1)?.prompt).toContain("Current step 2: third");
      await expect(readFile(laterFlowerFile, "utf8")).resolves.toBe(laterFlowerBytesBefore);
      await expect(readFile(statePath, "utf8")).resolves.toBe(stateBytesBefore);

      await rm(activeStatePath(dir, "step-index-session"), { force: true });
      const paddedResumeCtx = createCommandContext(dir, {
        sessionManager: createSessionManager(dir, "step-padded-index-session"),
      });
      await pi.commands.wf.handler("resume resume-step-index --step 02", paddedResumeCtx);

      await expect(
        readActiveWorkflowState(activeStatePath(dir, "step-padded-index-session")),
      ).resolves.toMatchObject({
        currentStepIndex: 2,
        sessionId: "step-padded-index-session",
      });
      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        currentStepIndex: 2,
        sessionId: "step-padded-index-session",
      });
      expect(sentWorkflowerPrompts(pi).at(-1)?.prompt).toContain("Current step 2: third");
      await expect(readFile(laterFlowerFile, "utf8")).resolves.toBe(laterFlowerBytesBefore);
      await expect(readFile(statePath, "utf8")).resolves.toBe(stateBytesBefore);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("resolves step override by exact step id", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const resumePath = join(dir, ".workflower", "workflows", "resume-step-id", "resume.json");

    try {
      registerWorkflow({
        id: "resume-step-id-demo",
        steps: [
          { id: "draft-story", command: "/draft-story" },
          { id: "route-story-review", command: "/route-story-review" },
          { id: "finish", command: "/finish" },
        ],
      });
      registerWorkflower(pi);

      await pi.commands["wf:resume-step-id-demo"].handler("resume-step-id", ctx);
      await rm(activeStatePath(dir), { force: true });

      const resumeCtx = createCommandContext(dir, {
        sessionManager: createSessionManager(dir, "step-id-session"),
      });
      await pi.commands.wf.handler("resume resume-step-id --step route-story-review", resumeCtx);

      await expect(
        readActiveWorkflowState(activeStatePath(dir, "step-id-session")),
      ).resolves.toMatchObject({
        id: "resume-step-id-demo",
        gardenName: "resume-step-id",
        currentStepIndex: 1,
        sessionId: "step-id-session",
      });
      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        sessionId: "step-id-session",
      });
      expect(sentWorkflowerPrompts(pi).at(-1)?.prompt).toContain(
        "Current step 1: route-story-review",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects invalid step overrides without mutating state", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const resumePath = join(dir, ".workflower", "workflows", "resume-step-invalid", "resume.json");

    try {
      registerWorkflow({
        id: "resume-step-invalid-demo",
        steps: [
          { id: "first", command: "/first" },
          { id: "duplicate", command: "/duplicate-one" },
          { id: "duplicate", command: "/duplicate-two" },
        ],
      });
      registerWorkflower(pi);

      await pi.commands["wf:resume-step-invalid-demo"].handler("resume-step-invalid", ctx);
      await rm(activeStatePath(dir), { force: true });
      const resumeBytesBefore = await readFile(resumePath, "utf8");

      const invalidCases = [
        {
          args: "resume-step-invalid --step missing-step",
          expected:
            "Cannot resume garden resume-step-invalid; step id missing-step is not valid for workflow resume-step-invalid-demo.",
        },
        {
          args: "resume-step-invalid --step 3",
          expected:
            "Cannot resume garden resume-step-invalid; step index 3 is not valid for workflow resume-step-invalid-demo.",
        },
        {
          args: "resume-step-invalid --step -1",
          expected:
            "Cannot resume garden resume-step-invalid; step index -1 is not valid for workflow resume-step-invalid-demo.",
        },
        {
          args: "resume-step-invalid --step",
          expected: "Usage: /wf resume <garden-name> [--step <step-index-or-id>]",
        },
        {
          args: "resume-step-invalid --step=1",
          expected: "Usage: /wf resume <garden-name> [--step <step-index-or-id>]",
        },
        {
          args: "resume-step-invalid --step 1 extra",
          expected: "Usage: /wf resume <garden-name> [--step <step-index-or-id>]",
        },
        {
          args: "resume-step-invalid extra",
          expected: "Usage: /wf resume <garden-name> [--step <step-index-or-id>]",
        },
        {
          args: "resume-step-invalid --step duplicate",
          expected:
            "Cannot resume garden resume-step-invalid; step id duplicate is ambiguous for workflow resume-step-invalid-demo.",
        },
      ];

      for (const [index, invalidCase] of invalidCases.entries()) {
        const invalidCtx = createCommandContext(dir, {
          sessionManager: createSessionManager(dir, `invalid-step-session-${index}`),
        });

        await pi.commands.wf.handler(`resume ${invalidCase.args}`, invalidCtx);

        expect(invalidCtx.notifications.at(-1)).toEqual([invalidCase.expected, "error"]);
        await expect(
          access(activeStatePath(dir, `invalid-step-session-${index}`)),
        ).rejects.toThrow();
        await expect(readFile(resumePath, "utf8")).resolves.toBe(resumeBytesBefore);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("refuses unsafe or missing resume metadata without writing active state", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflower(pi);

      await pi.commands.wf.handler("resume ../bad", ctx);

      expect(ctx.notifications.at(-1)).toEqual([
        "Invalid garden-name: garden-name must be a safe path segment.",
        "error",
      ]);
      await expect(access(activeStatePath(dir))).rejects.toThrow();

      await mkdir(join(dir, ".workflower", "workflows", "old-garden"), { recursive: true });
      await pi.commands.wf.handler("resume old-garden", ctx);

      expect(ctx.notifications.at(-1)).toEqual([
        "Cannot resume garden old-garden; resume metadata is missing. Older gardens without durable metadata cannot be resumed.",
        "error",
      ]);
      await expect(access(activeStatePath(dir))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("refuses malformed, completed, stale, or path-escaping resume metadata", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const workflowsRoot = join(dir, ".workflower", "workflows");

    try {
      registerWorkflow({
        id: "resume-guarded",
        steps: [
          { id: "first", command: "/first" },
          { id: "second", command: "/second" },
        ],
      });
      registerWorkflower(pi);

      type ResumeCase = {
        name: string;
        mutate?: (
          state: Record<string, unknown>,
          paths: { gardenPath: string; flowerPath: string },
        ) => Record<string, unknown>;
        raw?: string;
        writeIndex?: false | { workflowId: string };
        expected: string;
      };
      const cases: ResumeCase[] = [
        {
          name: "malformed-json",
          raw: "{ not-json",
          expected: "Cannot resume garden malformed-json; resume metadata is malformed.",
        },
        {
          name: "unsupported-version",
          mutate: (state) => ({ ...state, version: 2 }),
          expected:
            "Cannot resume garden unsupported-version; resume metadata version is unsupported.",
        },
        {
          name: "completed-garden",
          mutate: (state) => ({ ...state, status: "completed" }),
          expected:
            "Cannot resume garden completed-garden; resume metadata is completed and cannot be resumed.",
        },
        {
          name: "unknown-workflow",
          mutate: (state) => ({ ...state, workflowId: "missing-workflow" }),
          writeIndex: { workflowId: "missing-workflow" },
          expected:
            "Cannot resume garden unknown-workflow; workflow id missing-workflow is not registered.",
        },
        {
          name: "bad-step",
          mutate: (state) => ({ ...state, currentStepIndex: 3 }),
          expected:
            "Cannot resume garden bad-step; current step index 3 is not valid for workflow resume-guarded.",
        },
        {
          name: "wrong-garden-path",
          mutate: (state) => ({ ...state, gardenPath: join(workflowsRoot, "other-garden") }),
          expected:
            "Cannot resume garden wrong-garden-path; resume metadata points at a different garden path.",
        },
        {
          name: "escaped-flower-path",
          mutate: (state, paths) => ({
            ...state,
            activeFlowerPath: join(paths.gardenPath, "..", "escaped-flower"),
          }),
          expected:
            "Cannot resume garden escaped-flower-path; active flower path escapes the garden.",
        },
        {
          name: "missing-flower-index",
          writeIndex: false,
          expected: "Cannot resume garden missing-flower-index; active flower index is missing.",
        },
        {
          name: "mismatched-flower-workflow",
          writeIndex: { workflowId: "other-workflow" },
          expected:
            "Cannot resume garden mismatched-flower-workflow; active flower belongs to workflow other-workflow, not resume-guarded.",
        },
      ];

      for (const resumeCase of cases) {
        const gardenPath = join(workflowsRoot, resumeCase.name);
        const flowerPath = join(gardenPath, "0001-resume-guarded");
        await mkdir(flowerPath, { recursive: true });
        const baseState: Record<string, unknown> = {
          version: 1,
          status: "active",
          sessionId: "previous-session",
          sessionFile: join(dir, "previous-session.jsonl"),
          workflowId: "resume-guarded",
          gardenName: resumeCase.name,
          gardenPath,
          activeFlowerName: "0001-resume-guarded",
          activeFlowerPath: flowerPath,
          currentStepIndex: 0,
          startedAt: "2026-01-02T03:04:05.000Z",
          updatedAt: "2026-01-02T03:04:05.000Z",
        };
        const resumePath = join(gardenPath, "resume.json");
        const resumeBytesBefore =
          resumeCase.raw ??
          `${JSON.stringify(
            resumeCase.mutate?.(baseState, { gardenPath, flowerPath }) ?? baseState,
            null,
            2,
          )}\n`;
        await writeFile(resumePath, resumeBytesBefore, "utf8");
        if (resumeCase.writeIndex !== false) {
          await writeFile(
            join(flowerPath, "index.json"),
            `${JSON.stringify(
              {
                status: "active",
                workflowId: resumeCase.writeIndex?.workflowId ?? "resume-guarded",
                flowerPath,
                pollen: [],
                pollenPinned: false,
              },
              null,
              2,
            )}\n`,
            "utf8",
          );
        }

        await pi.commands.wf.handler(`resume ${resumeCase.name}`, ctx);

        expect(ctx.notifications.at(-1)).toEqual([resumeCase.expected, "error"]);
        await expect(access(activeStatePath(dir))).rejects.toThrow();
        await expect(readFile(resumePath, "utf8")).resolves.toBe(resumeBytesBefore);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("refuses resume when this session already has an active workflow", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const resumePath = join(
      dir,
      ".workflower",
      "workflows",
      "resume-current-conflict",
      "resume.json",
    );
    const currentStatePath = activeStatePath(dir);

    try {
      registerWorkflow({
        id: "resume-current-conflict-demo",
        steps: [{ id: "first", command: "/first" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:resume-current-conflict-demo"].handler("resume-current-conflict", ctx);
      const resumeBytesBefore = await readFile(resumePath, "utf8");
      await writeActiveWorkflowState(currentStatePath, {
        sessionId: "session-id",
        sessionFile: join(dir, "session.jsonl"),
        id: "resume-current-conflict-demo",
        name: "already-active",
        gardenName: "already-active",
        gardenPath: join(dir, ".workflower", "workflows", "already-active"),
        activeFlowerName: "0001-resume-current-conflict-demo",
        activeFlowerPath: join(
          dir,
          ".workflower",
          "workflows",
          "already-active",
          "0001-resume-current-conflict-demo",
        ),
        workdir: join(
          dir,
          ".workflower",
          "workflows",
          "already-active",
          "0001-resume-current-conflict-demo",
        ),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      const activeBytesBefore = await readFile(currentStatePath, "utf8");

      await pi.commands.wf.handler("resume resume-current-conflict", ctx);

      expect(ctx.notifications.at(-1)).toEqual([
        "Refusing to resume garden resume-current-conflict; this session already has an active workflow.",
        "error",
      ]);
      await expect(readFile(currentStatePath, "utf8")).resolves.toBe(activeBytesBefore);
      await expect(readFile(resumePath, "utf8")).resolves.toBe(resumeBytesBefore);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("refuses resume when another tracked session owns the garden", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const resumePath = join(
      dir,
      ".workflower",
      "workflows",
      "resume-owned-conflict",
      "resume.json",
    );

    try {
      registerWorkflow({
        id: "resume-owned-conflict-demo",
        steps: [{ id: "first", command: "/first" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:resume-owned-conflict-demo"].handler("resume-owned-conflict", ctx);
      const resumeBytesBefore = await readFile(resumePath, "utf8");
      await rm(activeStatePath(dir), { force: true });
      await writeActiveWorkflowState(activeStatePath(dir, "other-session"), {
        sessionId: "other-session",
        sessionFile: join(dir, "other-session.jsonl"),
        id: "resume-owned-conflict-demo",
        name: "resume-owned-conflict",
        gardenPath: join(dir, ".workflower", "workflows", "resume-owned-conflict"),
        activeFlowerName: "0001-resume-owned-conflict-demo",
        activeFlowerPath: join(
          dir,
          ".workflower",
          "workflows",
          "resume-owned-conflict",
          "0001-resume-owned-conflict-demo",
        ),
        workdir: join(
          dir,
          ".workflower",
          "workflows",
          "resume-owned-conflict",
          "0001-resume-owned-conflict-demo",
        ),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      const resumeCtx = createCommandContext(dir, {
        sessionManager: createSessionManager(dir, "resumed-session"),
      });
      await pi.commands.wf.handler("resume resume-owned-conflict", resumeCtx);

      expect(resumeCtx.notifications.at(-1)).toEqual([
        "Refusing to resume garden resume-owned-conflict; it is already active in session other-session.",
        "error",
      ]);
      await expect(access(activeStatePath(dir, "resumed-session"))).rejects.toThrow();
      await expect(readFile(resumePath, "utf8")).resolves.toBe(resumeBytesBefore);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("starts a garden and persists a queued workflow from pipe syntax", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "pipe-source",
        steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
      });
      registerWorkflow({
        id: "pipe-target",
        steps: [{ id: "target", command: "/target", outputs: ["target.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:pipe-source"].handler("pipe-demo | pipe-target", ctx);

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "pipe-source",
        gardenName: "pipe-demo",
        activeFlowerName: "0001-pipe-source",
        queuedWorkflowIds: ["pipe-target"],
      });
      await expect(
        access(join(dir, ".workflower", "workflows", "pipe-demo", "0002-pipe-target")),
      ).rejects.toThrow();
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Execute this command: /source.");
      expect(ctx.notifications).toContainEqual([
        "Started workflow pipe-source as pipe-demo.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("hands off to a queued workflow from a final step without completing the garden", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "pipe-handoff-demo");
    const sourceFlower = join(gardenPath, "0001-pipe-final-source");
    const targetFlower = join(gardenPath, "0002-pipe-final-target");
    const sourceOutput = join(sourceFlower, "source.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "pipe-final-source",
        steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
      });
      registerWorkflow({
        id: "pipe-final-target",
        steps: [{ id: "target", command: "/target", outputs: ["target.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:pipe-final-source"].handler(
        "pipe-handoff-demo | pipe-final-target",
        ctx,
      );
      await writeFile(sourceOutput, "source pollen", "utf8");
      resetPiMessages(pi);

      await pi.commands.next.handler("", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "pipe-final-target",
        gardenName: "pipe-handoff-demo",
        gardenPath,
        activeFlowerName: "0002-pipe-final-target",
        activeFlowerPath: targetFlower,
        currentStepIndex: 0,
      });
      const activeState = await readActiveWorkflowState(statePath);
      expect(activeState.queuedWorkflowIds ?? []).toEqual([]);
      await expect(
        readFile(join(sourceFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "pipe-final-source",
        pollen: [sourceOutput],
      });
      await expect(
        readFile(join(targetFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "active",
        workflowId: "pipe-final-target",
      });
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Workflow: pipe-final-target");
      expect(prompts[0].prompt).toContain("Current step 0: target");
      expect(prompts[0].prompt).toContain("Incoming pollen paths:");
      expect(prompts[0].prompt).toContain(sourceOutput);
      expect(ctx.notifications).toContainEqual([
        "Started workflow pipe-final-target as next flower in pipe-handoff-demo.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("runs multiple queued workflows in order and completes after the final workflow", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "pipe-multi-demo");
    const sourceFlower = join(gardenPath, "0001-pipe-multi-a");
    const middleFlower = join(gardenPath, "0002-pipe-multi-b");
    const finalFlower = join(gardenPath, "0003-pipe-multi-c");
    const sourceOutput = join(sourceFlower, "source.md");
    const middleOutput = join(middleFlower, "middle.md");
    const finalOutput = join(finalFlower, "final.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);
    const newSession = vi.spyOn(ctx, "newSession");

    try {
      registerWorkflow({
        id: "pipe-multi-a",
        steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
      });
      registerWorkflow({
        id: "pipe-multi-b",
        steps: [{ id: "middle", command: "/middle", outputs: ["middle.md"] }],
      });
      registerWorkflow({
        id: "pipe-multi-c",
        steps: [{ id: "final", command: "/final", outputs: ["final.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:pipe-multi-a"].handler(
        "pipe-multi-demo | pipe-multi-b | pipe-multi-c",
        ctx,
      );

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "pipe-multi-a",
        gardenName: "pipe-multi-demo",
        activeFlowerName: "0001-pipe-multi-a",
        queuedWorkflowIds: ["pipe-multi-b", "pipe-multi-c"],
      });
      expect(newSession).not.toHaveBeenCalled();

      await writeFile(sourceOutput, "source pollen", "utf8");
      resetPiMessages(pi);
      await pi.commands.next.handler("", ctx);

      expect(newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "pipe-multi-b",
        gardenName: "pipe-multi-demo",
        activeFlowerName: "0002-pipe-multi-b",
        activeFlowerPath: middleFlower,
        queuedWorkflowIds: ["pipe-multi-c"],
      });
      await expect(
        readFile(join(sourceFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "pipe-multi-a",
        pollen: [sourceOutput],
      });
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain(middleOutput);

      await writeFile(middleOutput, "middle pollen", "utf8");
      resetPiMessages(pi);
      await pi.commands.next.handler("", ctx);

      expect(newSession).not.toHaveBeenCalled();
      const finalActiveState = await readActiveWorkflowState(statePath);
      expect(finalActiveState).toMatchObject({
        id: "pipe-multi-c",
        gardenName: "pipe-multi-demo",
        activeFlowerName: "0003-pipe-multi-c",
        activeFlowerPath: finalFlower,
      });
      expect(finalActiveState).not.toHaveProperty("queuedWorkflowIds");
      await expect(
        readFile(join(middleFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "pipe-multi-b",
        pollen: [middleOutput],
      });
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain(finalOutput);

      await writeFile(finalOutput, "final pollen", "utf8");
      resetPiMessages(pi);
      await pi.commands.next.handler("", ctx);

      expect(newSession).toHaveBeenCalledOnce();
      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(sourceFlower)).rejects.toThrow();
      await expect(access(middleFlower)).rejects.toThrow();
      await expect(access(finalFlower)).rejects.toThrow();
      expect(ctx.notifications.at(-1)).toEqual(["Workflow pipe-multi-c complete.", "info"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects an unknown queued workflow before creating active state", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "pipe-unknown-source",
        steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:pipe-unknown-source"].handler("pipe-demo | missing-id", ctx);

      expect(ctx.notifications).toContainEqual([
        expect.stringContaining("Unknown workflow id"),
        "error",
      ]);
      await expect(readActiveWorkflowState(activeStatePath(dir))).rejects.toThrow();
      await expect(
        access(join(dir, ".workflower", "workflows", "pipe-demo", "0001-pipe-unknown-source")),
      ).rejects.toThrow();
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a user-hidden queued workflow before creating active state", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "pipe-hidden-source",
        steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
      });
      registerWorkflow({
        id: "pipe-hidden-target",
        userInvocable: false,
        steps: [{ id: "target", command: "/target", outputs: ["target.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:pipe-hidden-source"].handler("pipe-demo | pipe-hidden-target", ctx);

      expect(ctx.notifications).toContainEqual([
        expect.stringContaining("not user-invocable"),
        "error",
      ]);
      await expect(readActiveWorkflowState(activeStatePath(dir))).rejects.toThrow();
      await expect(
        access(join(dir, ".workflower", "workflows", "pipe-demo", "0001-pipe-hidden-source")),
      ).rejects.toThrow();
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it.each([
    { name: "trailing pipe", args: "pipe-demo |", message: "Usage" },
    {
      name: "queued workflow with args",
      args: "pipe-demo | pipe-invalid-args-target extra",
      message: "Usage",
      targetId: "pipe-invalid-args-target",
    },
    {
      name: "empty middle segment",
      args: "pipe-demo | | pipe-invalid-empty-target",
      message: "Usage",
      targetId: "pipe-invalid-empty-target",
    },
    { name: "invalid workflow id", args: "pipe-demo | Invalid!", message: "Invalid workflow id" },
  ])(
    "rejects invalid pipeline syntax $name before creating active state",
    async ({ name, args, message, targetId }) => {
      const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
      const dir = await mkdtemp(join(tmpdir(), "workflower-"));
      const pi = createPiHarness();
      const ctx = createCommandContext(dir, { newSession: vi.fn() });
      const sourceId = `pipe-invalid-source-${name.replace(/\W+/g, "-")}`;

      try {
        registerWorkflow({
          id: sourceId,
          steps: [{ id: "source", command: "/source", outputs: ["source.md"] }],
        });
        if (targetId) {
          registerWorkflow({
            id: targetId,
            steps: [{ id: "target", command: "/target", outputs: ["target.md"] }],
          });
        }
        registerWorkflower(pi);

        await pi.commands[`wf:${sourceId}`].handler(args, ctx);

        expect(ctx.notifications).toContainEqual([expect.stringContaining(message), "error"]);
        await expect(readActiveWorkflowState(activeStatePath(dir))).rejects.toThrow();
        await expect(
          access(join(dir, ".workflower", "workflows", "pipe-demo", `0001-${sourceId}`)),
        ).rejects.toThrow();
        expect(sentWorkflowerPrompts(pi)).toEqual([]);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it("starts in the current session when the workflow disables clearOnStart", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "same-session-start-demo",
        clearOnStart: false,
        steps: [{ id: "first", command: "/first", outputs: ["first.md"] }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:same-session-start-demo"].handler("demo", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 0: first");
      expect(prompts[0].prompt).toContain("Execute this command: /first.");
      expect(pi.sentUserMessages).toEqual([]);
      const state = await readActiveWorkflowState(activeStatePath(dir));
      expect(state.id).toBe("same-session-start-demo");
      expect(state).not.toHaveProperty("contextBoundaryEntryId");
      expect(ctx.notifications.at(-1)).toEqual([
        "Started workflow same-session-start-demo as demo.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("applies first-step model and thinking settings before a default start prompt", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const model = { provider: "openai", id: "gpt-5.5-spark" };
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      modelRegistry: { find: vi.fn(() => model) },
    });

    try {
      registerWorkflow({
        id: "default-runtime-settings-demo",
        steps: [
          {
            id: "first",
            command: "/first",
            model: "openai/gpt-5.5-spark",
            thinkingLevel: "high",
          },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:default-runtime-settings-demo"].handler("demo", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      expect(ctx.modelRegistry.find).toHaveBeenCalledWith("openai", "gpt-5.5-spark");
      expect(pi.setModelCalls).toEqual([model]);
      expect(pi.setThinkingLevelCalls).toEqual(["high"]);
      expect(sentWorkflowerPrompts(pi)).toHaveLength(1);
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("selects the first available workflow step model fallback", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const fallbackModel = { provider: "openai", id: "gpt-5.3-codex-spark" };
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      modelRegistry: {
        find: vi.fn((provider: string, modelId: string) =>
          provider === "openai" && modelId === "gpt-5.3-codex-spark" ? fallbackModel : undefined,
        ),
      },
    });

    try {
      registerWorkflow({
        id: "model-fallback-settings-demo",
        steps: [
          {
            id: "first",
            command: "/first",
            model: ["openai-codex/gpt-5.3-codex-spark", "openai/gpt-5.3-codex-spark"],
          },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:model-fallback-settings-demo"].handler("demo", ctx);

      expect(ctx.modelRegistry.find).toHaveBeenCalledWith("openai-codex", "gpt-5.3-codex-spark");
      expect(ctx.modelRegistry.find).toHaveBeenCalledWith("openai", "gpt-5.3-codex-spark");
      expect(pi.setModelCalls).toEqual([fallbackModel]);
      expect(sentWorkflowerPrompts(pi)).toHaveLength(1);
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses the current default model when no workflow step model fallback works", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const unavailableModel = { provider: "openai-codex", id: "gpt-5.3-codex-spark" };
    pi.setModel = vi.fn(async () => false);
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      modelRegistry: { find: vi.fn(() => unavailableModel) },
    });

    try {
      registerWorkflow({
        id: "model-default-fallback-settings-demo",
        steps: [
          {
            id: "first",
            command: "/first",
            model: ["openai-codex/gpt-5.3-codex-spark", "openai/gpt-5.3-codex-spark"],
          },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:model-default-fallback-settings-demo"].handler("demo", ctx);

      expect(pi.setModel).toHaveBeenCalledTimes(2);
      expect(ctx.notifications).toContainEqual([
        expect.stringContaining("using current/default model"),
        "warning",
      ]);
      expect(sentWorkflowerPrompts(pi)).toHaveLength(1);
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses workflow runtime settings for steps without step overrides", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const workflowModel = { provider: "openai", id: "workflow-model" };
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      model: { provider: "openai", id: "base-model" },
      modelRegistry: {
        find: vi.fn((provider: string, modelId: string) =>
          provider === "openai" && modelId === "workflow-model" ? workflowModel : undefined,
        ),
      },
    });

    try {
      registerWorkflow({
        id: "workflow-runtime-settings-demo",
        model: "openai/workflow-model",
        thinkingLevel: "low",
        steps: [
          { id: "first", command: "/first" },
          { id: "second", command: "/second" },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:workflow-runtime-settings-demo"].handler("demo", ctx);
      await pi.commands.next.handler("", ctx);

      expect(pi.setModelCalls).toEqual([workflowModel, workflowModel]);
      expect(pi.setThinkingLevelCalls).toEqual(["low", "low"]);
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        runtimeDefaults: { model: "openai/base-model", thinkingLevel: "medium" },
        currentStepIndex: 1,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reapplies captured runtime defaults after a step-only override", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const baseModel = { provider: "openai", id: "base-model" };
    const stepModel = { provider: "openai", id: "step-model" };
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      model: baseModel,
      modelRegistry: {
        find: vi.fn((provider: string, modelId: string) => {
          if (provider !== "openai") return undefined;
          if (modelId === "base-model") return baseModel;
          if (modelId === "step-model") return stepModel;
          return undefined;
        }),
      },
    });

    try {
      registerWorkflow({
        id: "step-runtime-reset-demo",
        steps: [
          {
            id: "first",
            command: "/first",
            model: "openai/step-model",
            thinkingLevel: "high",
          },
          { id: "second", command: "/second" },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:step-runtime-reset-demo"].handler("demo", ctx);
      await pi.commands.next.handler("", ctx);

      expect(pi.setModelCalls).toEqual([stepModel, baseModel]);
      expect(pi.setThinkingLevelCalls).toEqual(["high", "medium"]);
      expect(sentWorkflowerPrompts(pi).at(-1)?.prompt).toContain("Current step 1: second");
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("restores captured runtime defaults after workflow completion", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const baseModel = { provider: "openai", id: "base-model" };
    const stepModel = { provider: "openai", id: "step-model" };
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      model: baseModel,
      modelRegistry: {
        find: vi.fn((provider: string, modelId: string) => {
          if (provider !== "openai") return undefined;
          if (modelId === "base-model") return baseModel;
          if (modelId === "step-model") return stepModel;
          return undefined;
        }),
      },
    });

    try {
      registerWorkflow({
        id: "completion-runtime-reset-demo",
        clearOnCompletion: false,
        steps: [
          {
            id: "only",
            command: "/only",
            model: "openai/step-model",
            thinkingLevel: "high",
          },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:completion-runtime-reset-demo"].handler("demo", ctx);
      await pi.commands.next.handler("", ctx);

      expect(pi.setModelCalls).toEqual([stepModel, baseModel]);
      expect(pi.setThinkingLevelCalls).toEqual(["high", "medium"]);
      expect(ctx.notifications.at(-1)).toEqual([
        "Workflow completion-runtime-reset-demo complete.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("tries step model candidates before workflow candidates and captured defaults", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const workflowModel = { provider: "openai", id: "workflow-model" };
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      model: { provider: "openai", id: "base-model" },
      modelRegistry: {
        find: vi.fn((provider: string, modelId: string) =>
          provider === "openai" && modelId === "workflow-model" ? workflowModel : undefined,
        ),
      },
    });

    try {
      registerWorkflow({
        id: "step-workflow-model-fallback-demo",
        model: "openai/workflow-model",
        steps: [
          {
            id: "first",
            command: "/first",
            model: ["openai/missing-step-model", "openai/also-missing-step-model"],
          },
        ],
      });
      registerWorkflower(pi);
      await pi.commands["wf:step-workflow-model-fallback-demo"].handler("demo", ctx);

      expect(ctx.modelRegistry.find).toHaveBeenNthCalledWith(1, "openai", "missing-step-model");
      expect(ctx.modelRegistry.find).toHaveBeenNthCalledWith(
        2,
        "openai",
        "also-missing-step-model",
      );
      expect(ctx.modelRegistry.find).toHaveBeenNthCalledWith(3, "openai", "workflow-model");
      expect(pi.setModelCalls).toEqual([workflowModel]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("creates a current-session boundary when clearOnStart is explicitly true", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "fresh-session-start-demo",
        clearOnStart: true,
        steps: [{ id: "first", command: "/first", outputs: ["first.md"] }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:fresh-session-start-demo"].handler("demo", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 0: first");
      expect(pi.sentUserMessages).toEqual([]);
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        contextBoundaryEntryId: "leaf-id",
      });
      expect(ctx.notifications).toContainEqual([
        "Started workflow fresh-session-start-demo as demo.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("starts without a boundary when the current session has no leaf id", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      sessionManager: createSessionManager(dir, "session-id", { getLeafId: () => undefined }),
    });

    try {
      registerWorkflow({
        id: "no-start-boundary-demo",
        steps: [{ id: "first", command: "/first" }],
      });
      registerWorkflower(pi);
      await pi.commands["wf:no-start-boundary-demo"].handler("demo", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      expect(sentWorkflowerPrompts(pi)).toHaveLength(1);
      expect(pi.sentUserMessages).toEqual([]);
      const state = await readActiveWorkflowState(activeStatePath(dir));
      expect(state.id).toBe("no-start-boundary-demo");
      expect(state).not.toHaveProperty("contextBoundaryEntryId");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scopes active workflows to the current Pi session", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const sessionA = createCommandContext(dir, {
      sessionManager: createSessionManager(dir, "session-a"),
      newSession: vi.fn(),
    });
    const sessionB = createCommandContext(dir, {
      sessionManager: createSessionManager(dir, "session-b"),
      newSession: vi.fn(),
    });

    try {
      registerWorkflow({
        id: "session-scoped-demo",
        clearOnStart: false,
        steps: [
          { id: "first", command: "/first" },
          { id: "second", command: "/second" },
        ],
      });
      registerWorkflower(pi);

      await pi.commands["wf:session-scoped-demo"].handler("alpha", sessionA);
      await pi.commands["wf:session-scoped-demo"].handler("bravo", sessionB);
      await pi.commands.next.handler("", sessionA);

      await expect(
        readActiveWorkflowState(activeStatePath(dir, "session-a")),
      ).resolves.toMatchObject({
        name: "alpha",
        currentStepIndex: 1,
      });
      await expect(
        readActiveWorkflowState(activeStatePath(dir, "session-b")),
      ).resolves.toMatchObject({
        name: "bravo",
        currentStepIndex: 0,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects duplicate workflow names within the same workflow id", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const sessionA = createCommandContext(dir, {
      sessionManager: createSessionManager(dir, "duplicate-name-a"),
      newSession: vi.fn(),
    });
    const sessionB = createCommandContext(dir, {
      sessionManager: createSessionManager(dir, "duplicate-name-b"),
      newSession: vi.fn(),
    });

    try {
      registerWorkflow({
        id: "duplicate-name-demo",
        clearOnStart: false,
        steps: [{ id: "first", command: "/first" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:duplicate-name-demo"].handler("shared", sessionA);
      await pi.commands["wf:duplicate-name-demo"].handler("shared", sessionB);

      expect(sessionB.notifications.at(-1)).toEqual([
        "Garden already has an initial flower for workflow duplicate-name-demo: shared.",
        "error",
      ]);
      await expect(access(activeStatePath(dir, "duplicate-name-b"))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it.each([
    ["", /Usage: \/wf:feature <garden-name>/],
    ["demo extra", /Usage: \/wf:feature <garden-name>/],
    ["../demo", /garden-name must be a safe path segment/],
  ])("reports invalid start input %s", async (args, pattern) => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();
    const ctx = createCommandContext("/repo");

    registerWorkflower(pi);
    await pi.commands["wf:feature"].handler(args, ctx);

    expect(ctx.notifications.at(-1)?.[0]).toMatch(pattern);
    expect(ctx.notifications.at(-1)?.[1]).toBe("error");
  });

  it("hands off the active flower to another workflow in the same garden with the existing boundary", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const firstFlower = join(
      dir,
      ".workflower",
      "workflows",
      "run-one",
      "0001-handoff-source-demo",
    );
    const secondFlower = join(
      dir,
      ".workflower",
      "workflows",
      "run-one",
      "0002-handoff-target-demo",
    );
    const pollenPath = join(firstFlower, "source.md");

    try {
      registerWorkflow({
        id: "handoff-source-demo",
        clearOnStart: false,
        steps: [
          { id: "source", command: "/source", outputs: ["source.md"] },
          { id: "review", command: "/review" },
        ],
      });
      registerWorkflow({
        id: "handoff-target-demo",
        clearOnStart: true,
        steps: [{ id: "target", command: "/target", outputs: ["target.md"] }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:handoff-source-demo"].handler("run-one", ctx);
      await pi.commands.next.handler("", ctx);
      resetPiMessages(pi);

      await pi.commands["wf:handoff-target-demo"].handler("", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        id: "handoff-target-demo",
        name: "run-one",
        gardenName: "run-one",
        gardenPath: join(dir, ".workflower", "workflows", "run-one"),
        activeFlowerName: "0002-handoff-target-demo",
        activeFlowerPath: secondFlower,
        workdir: secondFlower,
        currentStepIndex: 0,
        contextBoundaryEntryId: "leaf-id",
      });
      await expect(
        readFile(join(firstFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "handoff-source-demo",
        pollen: [pollenPath],
      });
      await expect(
        readFile(join(secondFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "active",
        workflowId: "handoff-target-demo",
        pollen: [],
      });
      await expect(access(firstFlower)).resolves.toBeUndefined();
      await expect(access(pollenPath)).rejects.toThrow();
      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 0: target");
      expect(prompts[0].prompt).toContain("Incoming pollen paths:");
      expect(prompts[0].prompt).toContain(pollenPath);
      expect(prompts[0].prompt).not.toContain("artifact contents");
      expect(pi.sentUserMessages).toEqual([]);
      expect(ctx.notifications).toContainEqual([
        "Started workflow handoff-target-demo as next flower in run-one.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("omits incoming pollen during handoff when the new workflow rejects pollen", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });
    const firstFlower = join(
      dir,
      ".workflower",
      "workflows",
      "run-one",
      "0001-handoff-no-pollen-source",
    );
    const pollenPath = join(firstFlower, "source.md");

    try {
      registerWorkflow({
        id: "handoff-no-pollen-source",
        clearOnStart: false,
        steps: [
          { id: "source", command: "/source", outputs: ["source.md"] },
          { id: "review", command: "/review" },
        ],
      });
      registerWorkflow({
        id: "handoff-no-pollen-target",
        acceptPollen: false,
        clearOnStart: false,
        steps: [{ id: "target", command: "/target" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:handoff-no-pollen-source"].handler("run-one", ctx);
      await pi.commands.next.handler("", ctx);
      resetPiMessages(pi);

      await pi.commands["wf:handoff-no-pollen-target"].handler("", ctx);

      const prompts = sentWorkflowerPrompts(pi);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].prompt).toContain("Current step 0: target");
      expect(prompts[0].prompt).not.toContain("Incoming pollen paths:");
      expect(prompts[0].prompt).not.toContain(pollenPath);
      expect(pi.sentUserMessages).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("queues a downstream workflow during active CLI handoff pipeline", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const gardenPath = join(dir, ".workflower", "workflows", "active-pipe-demo");
    const sourceFlower = join(gardenPath, "0001-active-pipe-source");
    const targetFlower = join(gardenPath, "0002-active-pipe-target");
    const finalFlower = join(gardenPath, "0003-active-pipe-final");
    const targetOutput = join(targetFlower, "target.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "active-pipe-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "active-pipe-target",
        steps: [{ id: "target", command: "/target", outputs: ["target.md"] }],
      });
      registerWorkflow({
        id: "active-pipe-final",
        steps: [{ id: "final", command: "/final" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:active-pipe-source"].handler("active-pipe-demo", ctx);
      resetPiMessages(pi);

      await pi.commands["wf:active-pipe-target"].handler("| active-pipe-final", ctx);

      expect(ctx.newSession).not.toHaveBeenCalled();
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "active-pipe-target",
        gardenName: "active-pipe-demo",
        activeFlowerName: "0002-active-pipe-target",
        activeFlowerPath: targetFlower,
        queuedWorkflowIds: ["active-pipe-final"],
      });
      await expect(
        readFile(join(sourceFlower, "index.json"), "utf8").then(JSON.parse),
      ).resolves.toMatchObject({
        status: "handedOff",
        workflowId: "active-pipe-source",
      });
      await expect(access(finalFlower)).rejects.toThrow();
      expect(sentWorkflowerPrompts(pi)).toHaveLength(1);
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain("Workflow: active-pipe-target");
      expect(ctx.notifications).toContainEqual([
        "Started workflow active-pipe-target as next flower in active-pipe-demo.",
        "info",
      ]);

      await writeFile(targetOutput, "target pollen", "utf8");
      resetPiMessages(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "active-pipe-final",
        gardenName: "active-pipe-demo",
        activeFlowerName: "0003-active-pipe-final",
        activeFlowerPath: finalFlower,
      });
      const finalActiveState = await readActiveWorkflowState(statePath);
      expect(finalActiveState).not.toHaveProperty("queuedWorkflowIds");
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain("Workflow: active-pipe-final");
      expect(sentWorkflowerPrompts(pi)[0].prompt).toContain(targetOutput);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects active pipeline handoff when the first segment has handoff arguments", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "active-pipe-arg-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "active-pipe-arg-target",
        steps: [{ id: "target", command: "/target" }],
      });
      registerWorkflow({
        id: "active-pipe-arg-final",
        steps: [{ id: "final", command: "/final" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:active-pipe-arg-source"].handler("active-pipe-arg-demo", ctx);
      resetPiMessages(pi);

      await pi.commands["wf:active-pipe-arg-target"].handler(
        "new-garden | active-pipe-arg-final",
        ctx,
      );

      expect(ctx.notifications.at(-1)).toEqual([
        "Usage: /wf:active-pipe-arg-target (no garden-name while a workflow is active)",
        "error",
      ]);
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "active-pipe-arg-source",
        gardenName: "active-pipe-arg-demo",
        activeFlowerName: "0001-active-pipe-arg-source",
      });
      await expect(
        access(
          join(
            dir,
            ".workflower",
            "workflows",
            "active-pipe-arg-demo",
            "0002-active-pipe-arg-target",
          ),
        ),
      ).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("updates resume metadata on user, queued, and model-tool handoffs", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, {
      newSession: vi.fn(),
      model: { provider: "test-provider", id: "test-model" },
    });
    const resumePath = join(dir, ".workflower", "workflows", "resume-handoff", "resume.json");

    try {
      registerWorkflow({
        id: "resume-handoff-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({ id: "resume-user-target", steps: [{ id: "user", command: "/user" }] });
      registerWorkflow({
        id: "resume-queued-target",
        steps: [{ id: "queued", command: "/queued" }],
      });
      registerWorkflow({ id: "resume-tool-target", steps: [{ id: "tool", command: "/tool" }] });
      registerWorkflower(pi);

      await pi.commands["wf:resume-handoff-source"].handler(
        "resume-handoff | resume-queued-target",
        ctx,
      );

      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-handoff-source",
        activeFlowerName: "0001-resume-handoff-source",
        currentStepIndex: 0,
        queuedWorkflowIds: ["resume-queued-target"],
        contextBoundaryEntryId: "leaf-id",
        runtimeDefaults: { model: "test-provider/test-model", thinkingLevel: "medium" },
      });

      await pi.commands["wf:resume-user-target"].handler("", ctx);

      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-user-target",
        activeFlowerName: "0002-resume-user-target",
        activeFlowerPath: join(
          dir,
          ".workflower",
          "workflows",
          "resume-handoff",
          "0002-resume-user-target",
        ),
        currentStepIndex: 0,
        queuedWorkflowIds: ["resume-queued-target"],
        contextBoundaryEntryId: "leaf-id",
        runtimeDefaults: { model: "test-provider/test-model", thinkingLevel: "medium" },
      });

      await pi.commands.next.handler("", ctx);

      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-queued-target",
        activeFlowerName: "0003-resume-queued-target",
        currentStepIndex: 0,
        contextBoundaryEntryId: "leaf-id",
        runtimeDefaults: { model: "test-provider/test-model", thinkingLevel: "medium" },
      });
      expect((await readResumeState(resumePath)).queuedWorkflowIds).toBeUndefined();

      await executeHandoffTool(pi, "resume-tool-target", ctx);

      await expect(readResumeState(resumePath)).resolves.toMatchObject({
        workflowId: "resume-tool-target",
        activeFlowerName: "0004-resume-tool-target",
        currentStepIndex: 0,
        contextBoundaryEntryId: "leaf-id",
        runtimeDefaults: { model: "test-provider/test-model", thinkingLevel: "medium" },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a user-hidden queued workflow during active CLI handoff before mutating state", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "active-pipe-hidden-source",
        steps: [{ id: "source", command: "/source" }],
      });
      registerWorkflow({
        id: "active-pipe-hidden-target",
        steps: [{ id: "target", command: "/target" }],
      });
      registerWorkflow({
        id: "active-pipe-hidden-final",
        userInvocable: false,
        steps: [{ id: "final", command: "/final" }],
      });
      registerWorkflower(pi);

      await pi.commands["wf:active-pipe-hidden-source"].handler("active-pipe-hidden-demo", ctx);
      resetPiMessages(pi);

      await pi.commands["wf:active-pipe-hidden-target"].handler("| active-pipe-hidden-final", ctx);

      expect(ctx.notifications.at(-1)).toEqual([
        "Workflow is not user-invocable in pipeline: active-pipe-hidden-final",
        "error",
      ]);
      expect(sentWorkflowerPrompts(pi)).toEqual([]);
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "active-pipe-hidden-source",
        gardenName: "active-pipe-hidden-demo",
        activeFlowerName: "0001-active-pipe-hidden-source",
      });
      await expect(
        access(
          join(
            dir,
            ".workflower",
            "workflows",
            "active-pipe-hidden-demo",
            "0002-active-pipe-hidden-target",
          ),
        ),
      ).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a new garden name while handing off an active workflow", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "active-current-session-demo",
        clearOnStart: false,
        steps: [{ id: "first", command: "/first" }],
      });
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "existing",
        gardenName: "existing",
        gardenPath: join(dir, ".workflower", "workflows", "existing"),
        activeFlowerName: "0001-feature",
        activeFlowerPath: join(dir, ".workflower", "workflows", "existing", "0001-feature"),
        workdir: join(dir, ".workflower", "workflows", "existing", "0001-feature"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);

      await pi.commands["wf:active-current-session-demo"].handler("new-garden", ctx);

      expect(ctx.notifications.at(-1)).toEqual([
        "Usage: /wf:active-current-session-demo (no garden-name while a workflow is active)",
        "error",
      ]);
      expect(ctx.newSession).not.toHaveBeenCalled();
      expect(pi.sentUserMessages).toHaveLength(0);
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        id: "feature",
        gardenName: "existing",
        activeFlowerName: "0001-feature",
      });
      await expect(
        access(
          join(dir, ".workflower", "workflows", "existing", "0002-active-current-session-demo"),
        ),
      ).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports filesystem failures clearly", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const fsFailureDir = await mkdtemp(join(tmpdir(), "workflower-"));
    const fsFailureCwd = join(fsFailureDir, "not-a-directory");
    const fsFailurePi = createPiHarness();
    const fsFailureCtx = createCommandContext(fsFailureCwd);
    registerWorkflower(fsFailurePi);

    try {
      await writeFile(fsFailureCwd, "", "utf8");
      await fsFailurePi.commands["wf:feature"].handler("demo", fsFailureCtx);
      expect(fsFailureCtx.notifications.at(-1)?.[0]).toMatch(/Failed to prepare workflow files/);
    } finally {
      await rm(fsFailureDir, { recursive: true, force: true });
    }
  });
});

async function createPrivateSkillPackage(
  skillSource: string,
  options: { skillDirName?: string; workflowerSkills?: string[] } = {},
): Promise<{ dir: string; packageUrl: string; skillPath: string }> {
  const skillDirName = options.skillDirName ?? "private-one";
  const dir = await mkdtemp(join(tmpdir(), "workflower-private-skills-"));
  const distDir = join(dir, "dist");
  const skillDir = join(dir, "skills", skillDirName);
  const extensionPath = join(distDir, "index.mjs");
  const skillPath = join(skillDir, "SKILL.md");

  await mkdir(distDir, { recursive: true });
  await mkdir(skillDir, { recursive: true });
  await writeFile(extensionPath, "export default function setup() {}\n", "utf8");
  await writeFile(skillPath, skillSource, "utf8");
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "fake-workflower-package",
        pi: { workflowerSkills: options.workflowerSkills ?? ["skills"] },
      },
      null,
      2,
    ),
    "utf8",
  );

  return { dir, packageUrl: pathToFileURL(extensionPath).href, skillPath };
}

function activeStatePath(cwd: string, sessionId = "session-id"): string {
  return join(cwd, ".workflower", "tmp", "workflows", "active", `${sessionId}.json`);
}

function cleanAssistantMessage(): any {
  return assistantMessageWithStopReason("stop");
}

function assistantMessageWithStopReason(
  stopReason: string,
  overrides: Record<string, unknown> = {},
): any {
  return {
    role: "assistant",
    content: [{ type: "text", text: "Done." }],
    provider: "test-provider",
    model: "test-model",
    stopReason,
    ...overrides,
  };
}

function createSessionManager(
  cwd: string,
  sessionId = "session-id",
  overrides: Record<string, any> = {},
): any {
  return {
    getSessionId: () => sessionId,
    getSessionFile: () => join(cwd, `${sessionId}.jsonl`),
    getLeafId: () => "leaf-id",
    getBranch: () => [],
    ...overrides,
  };
}

function createPiHarness(): {
  commands: Record<string, any>;
  tools: Record<string, any>;
  registeredCommands: string[];
  registeredTools: string[];
  handlers: Record<string, any[]>;
  sentUserMessages: Array<{ prompt: string; options: any }>;
  sentMessages: Array<{ message: any; options: any }>;
  messageRenderers: Record<string, any>;
  setModelCalls: any[];
  setThinkingLevelCalls: string[];
  registerCommand: (name: string, command: any) => void;
  registerTool: (tool: any) => void;
  on: (name: string, handler: any) => void;
  sendUserMessage: (prompt: string, options?: any) => void;
  sendMessage: (message: any, options?: any) => void;
  registerMessageRenderer: (customType: string, renderer: any) => void;
  setModel: (model: any) => Promise<boolean>;
  getThinkingLevel: () => string;
  setThinkingLevel: (level: string) => void;
} {
  return {
    commands: {},
    tools: {},
    registeredCommands: [],
    registeredTools: [],
    handlers: {},
    sentUserMessages: [],
    sentMessages: [],
    messageRenderers: {},
    setModelCalls: [],
    setThinkingLevelCalls: [],
    registerCommand(name, command) {
      this.registeredCommands.push(name);
      this.commands[name] = command;
    },
    registerTool(tool) {
      this.registeredTools.push(tool.name);
      this.tools[tool.name] = tool;
    },
    on(name, handler) {
      this.handlers[name] ??= [];
      this.handlers[name].push(handler);
    },
    sendUserMessage(prompt, options) {
      this.sentUserMessages.push({ prompt, options });
    },
    sendMessage(message, options) {
      this.sentMessages.push({ message, options });
    },
    registerMessageRenderer(customType, renderer) {
      this.messageRenderers[customType] = renderer;
    },
    async setModel(model) {
      this.setModelCalls.push(model);
      return true;
    },
    getThinkingLevel() {
      return "medium";
    },
    setThinkingLevel(level) {
      this.setThinkingLevelCalls.push(level);
    },
  };
}

function sentWorkflowerPrompts(pi: any): Array<{
  prompt: string;
  display: any;
  message: any;
  options: any;
}> {
  return pi.sentMessages
    .filter(({ message }: any) => message.customType === "workflower-prompt")
    .map(({ message, options }: any) => ({
      prompt: message.content,
      display: message.details,
      message,
      options,
    }));
}

function resetPiMessages(pi: any): void {
  pi.sentUserMessages = [];
  pi.sentMessages = [];
}

async function readResumeState(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function executeHandoffTool(pi: any, workflowId: string, ctx: any): Promise<any> {
  return pi.tools.workflower_handoff.execute(
    "tool-call-id",
    { workflowId },
    undefined,
    undefined,
    ctx,
  );
}

async function executeStateSetTool(pi: any, key: string, value: unknown, ctx: any): Promise<any> {
  return pi.tools.workflower_state_set.execute(
    "tool-call-id",
    { key, value },
    undefined,
    undefined,
    ctx,
  );
}

async function executeStateGetTool(pi: any, key: string, ctx: any): Promise<any> {
  return pi.tools.workflower_state_get.execute("tool-call-id", { key }, undefined, undefined, ctx);
}

async function executeStateListTool(pi: any, ctx: any): Promise<any> {
  return pi.tools.workflower_state_list.execute("tool-call-id", {}, undefined, undefined, ctx);
}

function messageEntry(id: string, parentId: string | null, role: string, content: string): any {
  return {
    type: "message",
    id,
    parentId,
    timestamp: "2026-01-02T03:04:05.000Z",
    message: { role, content, timestamp: "2026-01-02T03:04:05.000Z" },
  };
}

function createCommandContext(
  cwd: string,
  overrides: Partial<{ newSession: any; sessionManager: any; modelRegistry: any; model: any }> = {},
): {
  cwd: string;
  notifications: Array<[string, string]>;
  ui: { notify: (message: string, level: string) => void };
  sessionManager: any;
  modelRegistry: any;
  model?: any;
  newSession: any;
} {
  const ctx = {
    cwd,
    notifications: [] as Array<[string, string]>,
    ui: {
      notify(message: string, level: string) {
        ctx.notifications.push([message, level]);
      },
    },
    sessionManager: {
      getSessionId: () => "session-id",
      getSessionFile: () => join(cwd, "session.jsonl"),
      getLeafId: () => "leaf-id",
      getBranch: () => [],
    },
    modelRegistry: {
      find: () => undefined,
    },
    newSession: async (options: any) => {
      await options.withSession({ ...ctx, ui: ctx.ui, sendUserMessage: async () => undefined });
      return { cancelled: false };
    },
  };
  return { ...ctx, ...overrides };
}
