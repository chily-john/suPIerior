import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";

async function loadWorkflower(): Promise<Record<string, any>> {
  return import("../extension-src/workflower/index");
}

describe("package smoke", () => {
  it("loads a Pi extension entry point and public workflow API", async () => {
    const workflower = await loadWorkflower();

    expect(typeof workflower.default).toBe("function");
    expect(typeof workflower.defineWorkflow).toBe("function");
    expect(typeof workflower.findWorkflow).toBe("function");
    expect(workflower.findWorkflow("feature-to-github-issues")?.steps).toHaveLength(4);
  });
});

describe("workflow definitions and registry", () => {
  it("preserves workflow definitions without adding feature-specific behavior", async () => {
    const { defineWorkflow } = await loadWorkflower();
    const workflow = {
      id: "demo",
      type: "custom",
      steps: [{ id: "first", command: "/demo", outputs: ["demo.md"] }],
    };

    expect(defineWorkflow(workflow)).toEqual(workflow);
  });

  it("finds the included feature-to-github-issues workflow", async () => {
    const { findWorkflow } = await loadWorkflower();

    expect(findWorkflow("feature-to-github-issues")).toEqual({
      id: "feature-to-github-issues",
      type: "feature",
      steps: [
        { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
        { id: "plan-issues", command: "/feature-plan-issues", outputs: ["issues.md"] },
        { id: "review-issues", command: "/feature-review-issues", outputs: ["reviewed-issues.md"] },
        { id: "create-github-issues", command: "/github-create-issues" },
      ],
    });
  });
});

describe("paths, state, and prompts", () => {
  it("generates workdir and active-state paths under .pi", async () => {
    const { resolveWorkflowPaths } = await loadWorkflower();
    const paths = resolveWorkflowPaths("/repo", "feature", "release-notes");

    expect(paths.workdir).toBe(join("/repo", ".pi", "workflows", "feature", "release-notes"));
    expect(paths.activeStatePath).toBe(join("/repo", ".pi", "tmp", "workflows", "active.json"));
  });

  it("writes and reads durable active state", async () => {
    const { readActiveWorkflowState, writeActiveWorkflowState } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const state = {
      workflowId: "feature-to-github-issues",
      type: "feature",
      name: "release-notes",
      workdir: join(dir, ".pi", "workflows", "feature", "release-notes"),
      currentStepIndex: 0,
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };

    try {
      await writeActiveWorkflowState(join(dir, ".pi", "tmp", "workflows", "active.json"), state);

      await expect(
        readFile(join(dir, ".pi", "tmp", "workflows", "active.json"), "utf8"),
      ).resolves.toContain('"workflowId": "feature-to-github-issues"');
      await expect(
        readActiveWorkflowState(join(dir, ".pi", "tmp", "workflows", "active.json")),
      ).resolves.toEqual(state);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("renders a deterministic step-0 kickoff prompt with output paths resolved to the workdir", async () => {
    const { renderKickoffPrompt } = await loadWorkflower();
    const prompt = renderKickoffPrompt({
      workflowId: "feature-to-github-issues",
      type: "feature",
      name: "release-notes",
      workdir: join("/repo", ".pi", "workflows", "feature", "release-notes"),
      step: { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
      currentStepIndex: 0,
    });

    expect(prompt).toContain("Workflow: feature-to-github-issues");
    expect(prompt).toContain("Type: feature");
    expect(prompt).toContain("Name: release-notes");
    expect(prompt).toContain(
      `Workdir: ${join("/repo", ".pi", "workflows", "feature", "release-notes")}`,
    );
    expect(prompt).toContain("Current step 0: discover");
    expect(prompt).toContain("Command: /feature-discovery");
    expect(prompt).toContain(
      join("/repo", ".pi", "workflows", "feature", "release-notes", "feature.md"),
    );
    expect(prompt).toContain("After the user verifies this step's outputs, use /next");
  });
});

describe("/workflow status and cancel", () => {
  it("reports when no workflow is active", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflower(pi);
      await pi.commands.workflow.handler("status", ctx);

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

  it("shows active workflow details including the current step", async () => {
    const { default: registerWorkflower, writeActiveWorkflowState } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const workdir = join(dir, ".pi", "workflows", "feature", "release-notes");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(join(dir, ".pi", "tmp", "workflows", "active.json"), {
        workflowId: "feature-to-github-issues",
        type: "feature",
        name: "release-notes",
        workdir,
        currentStepIndex: 1,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.workflow.handler("status", ctx);

      const [message, level] = ctx.notifications.at(-1) ?? [];
      expect(level).toBe("info");
      expect(message).toContain("Active workflow: feature-to-github-issues");
      expect(message).toContain("Type: feature");
      expect(message).toContain("Name: release-notes");
      expect(message).toContain(`Workdir: ${workdir}`);
      expect(message).toContain("Current step 1: plan-issues");
      expect(message).toContain("Command: /feature-plan-issues");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports a missing workflow definition without mutating active state", async () => {
    const { default: registerWorkflower, writeActiveWorkflowState } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = join(dir, ".pi", "tmp", "workflows", "active.json");
    const state = {
      workflowId: "missing-workflow",
      type: "feature",
      name: "demo",
      workdir: join(dir, ".pi", "workflows", "feature", "demo"),
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
    const { default: registerWorkflower, writeActiveWorkflowState } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(join(dir, ".pi", "tmp", "workflows", "active.json"), {
        workflowId: "missing-workflow",
        type: "feature",
        name: "release-notes",
        workdir: join(dir, ".pi", "workflows", "feature", "release-notes"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.workflow.handler("status", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(
        /Active workflow references unknown workflow id: missing-workflow/,
      );
      expect(ctx.notifications.at(-1)?.[1]).toBe("warning");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports when cancel is requested without an active workflow", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      registerWorkflower(pi);
      await pi.commands.workflow.handler("cancel", ctx);

      expect(ctx.notifications.at(-1)).toEqual(["No active workflow to cancel.", "info"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("advances blindly to the next step and sends previous-output handoff in a fresh session", async () => {
    const {
      default: registerWorkflower,
      writeActiveWorkflowState,
      readActiveWorkflowState,
    } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = join(dir, ".pi", "tmp", "workflows", "active.json");
    const workdir = join(dir, ".pi", "workflows", "feature", "demo");
    const sentPrompts: string[] = [];
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, {
      newSession: async (options: any) => {
        const stateDuringSession = await readActiveWorkflowState(statePath);
        expect(stateDuringSession.currentStepIndex).toBe(1);
        await options.withSession({
          sendUserMessage: async (prompt: string) => sentPrompts.push(prompt),
        });
        return { cancelled: false };
      },
    });

    try {
      await writeActiveWorkflowState(statePath, {
        workflowId: "feature-to-github-issues",
        type: "feature",
        name: "demo",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      expect(ctx.notifications).toContainEqual([
        "Advanced workflow feature-to-github-issues to step 1.",
        "info",
      ]);
      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
      });
      expect(sentPrompts).toHaveLength(1);
      expect(sentPrompts[0]).toContain("Current step 1: plan-issues");
      expect(sentPrompts[0]).toContain("Command: /feature-plan-issues");
      expect(sentPrompts[0]).toContain("Previous step outputs:");
      expect(sentPrompts[0]).toContain(join(workdir, "feature.md"));
      expect(sentPrompts[0]).toContain("Expected outputs:");
      expect(sentPrompts[0]).toContain(join(workdir, "issues.md"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clears active workflow state without deleting workflow artifacts", async () => {
    const { default: registerWorkflower, writeActiveWorkflowState } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const activeStatePath = join(dir, ".pi", "tmp", "workflows", "active.json");
    const workdir = join(dir, ".pi", "workflows", "feature", "release-notes");
    const artifactPath = join(workdir, "feature.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(activeStatePath, {
        workflowId: "feature-to-github-issues",
        type: "feature",
        name: "release-notes",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(artifactPath, "artifact", "utf8");

      registerWorkflower(pi);
      await pi.commands.workflow.handler("cancel", ctx);

      await expect(access(activeStatePath)).rejects.toThrow();
      await expect(readFile(artifactPath, "utf8")).resolves.toBe("artifact");
      expect(ctx.notifications.at(-1)).toEqual([
        "Cancelled workflow feature-to-github-issues (release-notes). Workflow artifacts were not deleted.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clears active state at the end and does not create another session", async () => {
    const {
      default: registerWorkflower,
      writeActiveWorkflowState,
      readActiveWorkflowState,
    } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = join(dir, ".pi", "tmp", "workflows", "active.json");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      await writeActiveWorkflowState(statePath, {
        workflowId: "feature-to-github-issues",
        type: "feature",
        name: "demo",
        workdir: join(dir, ".pi", "workflows", "feature", "demo"),
        currentStepIndex: 3,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      expect(ctx.notifications.at(-1)).toEqual([
        "Workflow feature-to-github-issues complete.",
        "info",
      ]);
      expect(ctx.newSession).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports helpful unknown workflow subcommands", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();
    const ctx = createCommandContext("/repo");

    registerWorkflower(pi);
    await pi.commands.workflow.handler("frobnicate", ctx);

    expect(ctx.notifications.at(-1)?.[0]).toMatch(
      /Unknown workflow command: frobnicate\. Available commands: start, status, cancel\./,
    );
    expect(ctx.notifications.at(-1)?.[1]).toBe("error");
  });
  it.each([
    ["cancelled", async () => ({ cancelled: true }), /Session creation was cancelled/, "error"],
    [
      "failed",
      async () => {
        throw new Error("boom");
      },
      /Session creation failed: boom/,
      "error",
    ],
  ])(
    "keeps advanced state when next-step session creation is %s",
    async (_label, newSession, message, level) => {
      const {
        default: registerWorkflower,
        writeActiveWorkflowState,
        readActiveWorkflowState,
      } = await loadWorkflower();
      const dir = await mkdtemp(join(tmpdir(), "workflower-"));
      const statePath = join(dir, ".pi", "tmp", "workflows", "active.json");
      const pi = createPiHarness();
      const ctx = createCommandContext(dir, { newSession });

      try {
        await writeActiveWorkflowState(statePath, {
          workflowId: "feature-to-github-issues",
          type: "feature",
          name: "demo",
          workdir: join(dir, ".pi", "workflows", "feature", "demo"),
          currentStepIndex: 0,
          startedAt: "2026-01-02T03:04:05.000Z",
          updatedAt: "2026-01-02T03:04:05.000Z",
        });
        registerWorkflower(pi);
        await pi.commands.next.handler("", ctx);

        expect(ctx.notifications.at(-1)?.[0]).toMatch(message);
        expect(ctx.notifications.at(-1)?.[1]).toBe(level);
        await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
          currentStepIndex: 1,
        });
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
});

describe("/workflow start", () => {
  it("registers /workflow and starts a known workflow in a fresh session", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const sentPrompts: string[] = [];
    const ctx = createCommandContext(dir, {
      newSession: async (options: any) => {
        await options.withSession({
          sendUserMessage: async (prompt: string) => sentPrompts.push(prompt),
        });
        return { cancelled: false };
      },
    });

    try {
      registerWorkflower(pi);
      await pi.commands.workflow.handler("start feature-to-github-issues release-notes", ctx);

      expect(ctx.notifications).toContainEqual([
        "Started workflow feature-to-github-issues as release-notes.",
        "info",
      ]);
      await expect(
        readFile(join(dir, ".pi", "tmp", "workflows", "active.json"), "utf8"),
      ).resolves.toContain('"name": "release-notes"');
      await expect(
        readFile(join(dir, ".pi", "workflows", "feature", "release-notes", ".keep"), "utf8"),
      ).resolves.toBe("");
      expect(sentPrompts).toHaveLength(1);
      expect(sentPrompts[0]).toContain("Command: /feature-discovery");
      expect(sentPrompts[0]).toContain(
        join(dir, ".pi", "workflows", "feature", "release-notes", "feature.md"),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it.each([
    ["", /Usage: \/workflow start <workflow-id> <workflow-name>/],
    ["start", /Usage: \/workflow start <workflow-id> <workflow-name>/],
    ["status feature-to-github-issues demo", /Unknown workflow command/],
    ["start missing demo", /Unknown workflow id: missing/],
    ["start feature-to-github-issues ../demo", /workflow-name must be a safe path segment/],
  ])("reports invalid start input %s", async (args, pattern) => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();
    const ctx = createCommandContext("/repo");

    registerWorkflower(pi);
    await pi.commands.workflow.handler(args, ctx);

    expect(ctx.notifications.at(-1)?.[0]).toMatch(pattern);
    expect(ctx.notifications.at(-1)?.[1]).toBe("error");
  });

  it("reports an existing active workflow before creating a new session", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      await writeFile(join(dir, ".pi", "tmp", "workflows", "active.json"), "{}", {
        flag: "w",
        encoding: "utf8",
      }).catch(async () => {
        const { mkdir, writeFile } = await import("node:fs/promises");
        await mkdir(join(dir, ".pi", "tmp", "workflows"), { recursive: true });
        await writeFile(join(dir, ".pi", "tmp", "workflows", "active.json"), "{}", "utf8");
      });

      registerWorkflower(pi);
      await pi.commands.workflow.handler("start feature-to-github-issues demo", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(/An active workflow already exists/);
      expect(ctx.newSession).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports filesystem and session creation failures clearly", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const fsFailureDir = await mkdtemp(join(tmpdir(), "workflower-"));
    const fsFailureCwd = join(fsFailureDir, "not-a-directory");
    const fsFailurePi = createPiHarness();
    const fsFailureCtx = createCommandContext(fsFailureCwd);
    registerWorkflower(fsFailurePi);

    try {
      await writeFile(fsFailureCwd, "", "utf8");
      await fsFailurePi.commands.workflow.handler(
        "start feature-to-github-issues demo",
        fsFailureCtx,
      );
      expect(fsFailureCtx.notifications.at(-1)?.[0]).toMatch(/Failed to prepare workflow files/);
    } finally {
      await rm(fsFailureDir, { recursive: true, force: true });
    }

    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const sessionFailurePi = createPiHarness();
    const sessionFailureCtx = createCommandContext(dir, {
      newSession: async () => ({ cancelled: true }),
    });
    try {
      registerWorkflower(sessionFailurePi);
      await sessionFailurePi.commands.workflow.handler(
        "start feature-to-github-issues demo",
        sessionFailureCtx,
      );
      expect(sessionFailureCtx.notifications.at(-1)?.[0]).toMatch(/Session creation was cancelled/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

function createPiHarness(): {
  commands: Record<string, any>;
  registerCommand: (name: string, command: any) => void;
} {
  return {
    commands: {},
    registerCommand(name, command) {
      this.commands[name] = command;
    },
  };
}

function createCommandContext(
  cwd: string,
  overrides: Partial<{ newSession: any }> = {},
): {
  cwd: string;
  notifications: Array<[string, string]>;
  ui: { notify: (message: string, level: string) => void };
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
    newSession: async (options: any) => {
      await options.withSession({ sendUserMessage: async () => undefined });
      return { cancelled: false };
    },
  };
  return { ...ctx, ...overrides };
}
