import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveActiveStatePath } from "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-paths";
import {
  readActiveWorkflowState,
  writeActiveWorkflowState,
} from "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store";
import { resolveWorkflowPaths } from "../extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/artifact-paths";
import { renderStepKickoffPrompt } from "../extension-src/workflower/internals/workflow-orchestration/prompting/step-kickoff/render-step-kickoff-prompt";
import { beforeAll, describe, expect, it, vi } from "vitest";

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
});

describe("package smoke", () => {
  it("loads a Pi extension entry point and public workflow API", async () => {
    const workflower = await loadWorkflower();

    expect(typeof workflower.default).toBe("function");
    expect(typeof workflower.registerWorkflow).toBe("function");
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

describe("paths, state, and prompts", () => {
  it("generates workdir and active-state paths under .pi", async () => {
    const paths = resolveWorkflowPaths("/repo", "feature", "release-notes");

    expect(paths.gardenPath).toBe(join("/repo", ".pi", "workflows", "release-notes"));
    expect(paths.flowerName).toBe("0001-feature");
    expect(paths.flowerPath).toBe(
      join("/repo", ".pi", "workflows", "release-notes", "0001-feature"),
    );
    expect(paths.workdir).toBe(join("/repo", ".pi", "workflows", "release-notes", "0001-feature"));
    expect(resolveActiveStatePath("/repo", "session-id")).toBe(activeStatePath("/repo"));
  });

  it("writes and reads durable active state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const state = {
      sessionId: "session-id",
      id: "feature",
      name: "release-notes",
      workdir: join(dir, ".pi", "workflows", "feature", "release-notes"),
      currentStepIndex: 0,
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };

    try {
      await writeActiveWorkflowState(activeStatePath(dir), state);

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
      workdir: join("/repo", ".pi", "workflows", "feature", "release-notes"),
      step: { id: "discover", command: "/feature-discovery", outputs: ["feature.md"] },
      currentStepIndex: 0,
    });

    expect(prompt).toContain("Workflow: feature");
    expect(prompt).toContain("Name: release-notes");
    expect(prompt).toContain(
      `Workdir: ${join("/repo", ".pi", "workflows", "feature", "release-notes")}`,
    );
    expect(prompt).toContain("Current step 0: discover");
    expect(prompt).toContain("Execute this command: /feature-discovery.");
    expect(prompt).toContain(
      join("/repo", ".pi", "workflows", "feature", "release-notes", "feature.md"),
    );
  });

  it("omits manual next instructions for autoNext kickoff prompts", async () => {
    const prompt = renderStepKickoffPrompt({
      id: "custom",
      name: "demo",
      workdir: join("/repo", ".pi", "workflows", "custom", "demo"),
      step: { id: "first", command: "/first", outputs: ["first.md"], autoNext: true },
      currentStepIndex: 0,
    });

    expect(prompt).toContain("Execute this command: /first.");
    expect(prompt).not.toContain("After the user verifies this step's outputs, use /next");
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
    expect(pi.commands.wf.description).toMatch(/Inspect and stop the active Workflower workflow/);
    expect(typeof pi.commands.wf.handler).toBe("function");
    expect(pi.commands["wf:feature"].description).toMatch(/Start Workflower workflow feature/);
    expect(typeof pi.commands["wf:feature"].handler).toBe("function");
    expect(pi.commands.next.description).toMatch(/Advance the active Workflower workflow/);
    expect(typeof pi.commands.next.handler).toBe("function");
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

  it("sets up Workflower commands and events idempotently for the same Pi instance", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const pi = createPiHarness();

    registerWorkflower(pi);
    const commandCountAfterFirstSetup = pi.registeredCommands.length;
    registerWorkflower(pi);

    expect(pi.registeredCommands).toHaveLength(commandCountAfterFirstSetup);
    expect(pi.registeredCommands.filter((name) => name === "wf")).toHaveLength(1);
    expect(pi.registeredCommands.filter((name) => name === "next")).toHaveLength(1);
    expect(pi.handlers.agent_end).toHaveLength(1);
    expect(pi.handlers.context).toHaveLength(1);
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

  it("shows active workflow details including the current step", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const workdir = join(dir, ".pi", "workflows", "feature", "release-notes");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "release-notes",
        workdir,
        currentStepIndex: 1,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.wf.handler("status", ctx);

      const [message, level] = ctx.notifications.at(-1) ?? [];
      expect(level).toBe("info");
      expect(message).toContain("Active workflow: feature");
      expect(message).toContain("Name: release-notes");
      expect(message).toContain(`Workdir: ${workdir}`);
      expect(message).toContain("Current step 1: plan-issues");
      expect(message).toContain("Command: /feature-plan-issues");
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
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "missing-workflow",
        name: "release-notes",
        workdir: join(dir, ".pi", "workflows", "feature", "release-notes"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.wf.handler("status", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(
        /Active workflow references unknown workflow id: missing-workflow/,
      );
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

  it("clears active workflow state without deleting workflow artifacts", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".pi", "workflows", "feature", "release-notes");
    const artifactPath = join(workdir, "feature.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "release-notes",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(artifactPath, "artifact", "utf8");

      registerWorkflower(pi);
      await pi.commands.wf.handler("stop", ctx);

      await expect(access(statePath)).rejects.toThrow();
      await expect(readFile(artifactPath, "utf8")).resolves.toBe("artifact");
      expect(ctx.notifications.at(-1)).toEqual([
        "Stopped workflow feature (release-notes). Workflow artifacts were not deleted.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("lists current-session and stale workflow states", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "current",
        workdir: join(dir, ".pi", "workflows", "feature", "current"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await writeActiveWorkflowState(activeStatePath(dir, "other-session"), {
        sessionId: "other-session",
        id: "feature",
        name: "stale",
        workdir: join(dir, ".pi", "workflows", "feature", "stale"),
        currentStepIndex: 1,
        startedAt: "2026-01-02T04:05:06.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });

      registerWorkflower(pi);
      await pi.commands.wf.handler("list", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toContain("feature (current) step 0 - current session");
      expect(ctx.notifications.at(-1)?.[0]).toContain(
        "feature (stale) step 1 - stale/other session",
      );
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
      /Unknown wf command: frobnicate\. Available commands: status, stop, list\./,
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
    const pi = createPiHarness();

    try {
      registerWorkflow({
        id: "auto-next-demo",
        steps: [
          { id: "first", command: "/first", autoNext: true },
          { id: "second", command: "/second" },
        ],
      });
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "auto-next-demo",
        name: "demo",
        workdir: join(dir, ".pi", "workflows", "auto-next-demo", "demo"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0]({ type: "agent_end" }, createCommandContext(dir));

      await expect(readActiveWorkflowState(activeStatePath(dir))).resolves.toMatchObject({
        currentStepIndex: 1,
        contextBoundaryEntryId: "leaf-id",
      });
      expect(pi.sentUserMessages).toHaveLength(1);
      expect(pi.sentUserMessages[0].prompt).toContain("Current step 1: second");
      expect(pi.sentUserMessages[0].prompt).not.toBe("/next");
      expect(pi.sentUserMessages[0].options).toEqual({ deliverAs: "followUp" });
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
        workdir: join(dir, ".pi", "workflows", "auto-next-no-clear-demo", "demo"),
        currentStepIndex: 0,
        contextBoundaryEntryId: "existing-boundary",
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.handlers.agent_end[0]({ type: "agent_end" }, createCommandContext(dir));

      await expect(readActiveWorkflowState(statePath)).resolves.toMatchObject({
        currentStepIndex: 1,
        contextBoundaryEntryId: "existing-boundary",
      });
      expect(pi.sentUserMessages[0].prompt).toContain("Current step 1: second");
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
        workdir: join(dir, ".pi", "workflows", "feature", "demo"),
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
        workdir: join(dir, ".pi", "workflows", "feature", "demo"),
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
        workdir: join(dir, ".pi", "workflows", "feature", "demo"),
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
        workdir: join(dir, ".pi", "workflows", "feature", "demo"),
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

  it("reports a missing workflow definition without mutating active state", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const state = {
      sessionId: "session-id",
      id: "missing-workflow",
      name: "demo",
      workdir: join(dir, ".pi", "workflows", "missing-workflow", "demo"),
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
    const workdir = join(dir, ".pi", "workflows", "same-session-demo", "same-session-demo");
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
      expect(pi.sentUserMessages).toHaveLength(1);
      expect(pi.sentUserMessages[0].prompt).toContain("Current step 1: second");
      expect(pi.sentUserMessages[0].prompt).toContain("Execute this command: /second.");
      expect(ctx.notifications.at(-1)).toEqual([
        "Advanced workflow same-session-demo to step 1.",
        "info",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("advances blindly to the next step and sends previous-output handoff in the current session with a boundary", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".pi", "workflows", "feature", "demo");
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
      expect(pi.sentUserMessages).toHaveLength(1);
      expect(pi.sentUserMessages[0].prompt).toContain("Current step 1: plan-issues");
      expect(pi.sentUserMessages[0].prompt).toContain(
        "Execute this command: /feature-plan-issues.",
      );
      expect(pi.sentUserMessages[0].prompt).toContain("Previous step outputs:");
      expect(pi.sentUserMessages[0].prompt).toContain(join(workdir, "feature.md"));
      expect(pi.sentUserMessages[0].prompt).toContain("Expected outputs:");
      expect(pi.sentUserMessages[0].prompt).toContain(join(workdir, "issues.md"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("clears active workflow state without deleting workflow artifacts", async () => {
    const { default: registerWorkflower } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".pi", "workflows", "feature", "release-notes");
    const artifactPath = join(workdir, "feature.md");
    const pi = createPiHarness();
    const ctx = createCommandContext(dir);

    try {
      await writeActiveWorkflowState(statePath, {
        sessionId: "session-id",
        id: "feature",
        name: "release-notes",
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T04:05:06.000Z",
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(artifactPath, "artifact", "utf8");

      registerWorkflower(pi);
      await pi.commands.wf.handler("stop", ctx);

      await expect(access(statePath)).rejects.toThrow();
      await expect(readFile(artifactPath, "utf8")).resolves.toBe("artifact");
      expect(ctx.notifications.at(-1)).toEqual([
        "Stopped workflow feature (release-notes). Workflow artifacts were not deleted.",
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
    const workdir = join(dir, ".pi", "workflows", "feature", "demo");
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

  it("preserves workflow artifacts on completion when cleanupOnCompletion is false", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".pi", "workflows", "keep-artifacts-demo", "keep-artifacts-demo");
    const artifactPath = join(workdir, "artifact.md");
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
      registerWorkflower(pi);
      await pi.commands.next.handler("", ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
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
      ".pi",
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

  it("falls back to current-session completion when final-step auto-next completes", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const statePath = activeStatePath(dir);
    const workdir = join(dir, ".pi", "workflows", "auto-complete-demo", "auto-complete-demo");
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
        workdir,
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });
      await mkdir(workdir, { recursive: true });
      await writeFile(join(workdir, "artifact.md"), "artifact", "utf8");
      registerWorkflower(pi);
      await pi.handlers.agent_end[0]({ type: "agent_end" }, ctx);

      await expect(readActiveWorkflowState(statePath)).rejects.toThrow();
      await expect(access(workdir)).rejects.toThrow();
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
    const workdir = join(dir, ".pi", "workflows", "feature", "demo");
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
        workdir: join(dir, ".pi", "workflows", "feature", "demo"),
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
        workdir: join(dir, ".pi", "workflows", "feature", "demo"),
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
        gardenPath: join(dir, ".pi", "workflows", "release-notes"),
        activeFlowerName: "0001-feature",
        activeFlowerPath: join(dir, ".pi", "workflows", "release-notes", "0001-feature"),
        currentStepIndex: 0,
        contextBoundaryEntryId: "leaf-id",
      });
      await expect(
        readFile(
          join(dir, ".pi", "workflows", "release-notes", "0001-feature", "index.json"),
          "utf8",
        ).then(JSON.parse),
      ).resolves.toMatchObject({
        status: "active",
        workflowId: "feature",
        flowerPath: join(dir, ".pi", "workflows", "release-notes", "0001-feature"),
        pollen: [],
        pollenPinned: false,
      });
      await expect(
        access(join(dir, ".pi", "workflows", "release-notes", "index.json")),
      ).rejects.toThrow();
      expect(pi.sentUserMessages).toHaveLength(1);
      expect(pi.sentUserMessages[0].prompt).not.toBe("/wf-start-current-step");
      expect(pi.sentUserMessages[0].prompt).toContain("Execute this command: /feature-discovery.");
      expect(pi.sentUserMessages[0].prompt).toContain(
        join(dir, ".pi", "workflows", "release-notes", "0001-feature", "feature.md"),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

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
      expect(pi.sentUserMessages).toHaveLength(1);
      expect(pi.sentUserMessages[0].prompt).toContain("Current step 0: first");
      expect(pi.sentUserMessages[0].prompt).toContain("Execute this command: /first.");
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
      expect(pi.sentUserMessages).toHaveLength(1);
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
      expect(pi.sentUserMessages).toHaveLength(1);
      expect(pi.sentUserMessages[0].prompt).toContain("Current step 0: first");
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
      expect(pi.sentUserMessages).toHaveLength(1);
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

  it("reports an existing active workflow in the current session", async () => {
    const { default: registerWorkflower, registerWorkflow } = await loadWorkflower();
    const dir = await mkdtemp(join(tmpdir(), "workflower-"));
    const pi = createPiHarness();
    const ctx = createCommandContext(dir, { newSession: vi.fn() });

    try {
      registerWorkflow({
        id: "active-current-session-demo",
        clearOnStart: false,
        steps: [{ id: "first", command: "/first" }],
      });
      await writeActiveWorkflowState(activeStatePath(dir), {
        sessionId: "session-id",
        id: "feature",
        name: "existing",
        workdir: join(dir, ".pi", "workflows", "feature", "existing"),
        currentStepIndex: 0,
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      registerWorkflower(pi);
      await pi.commands["wf:active-current-session-demo"].handler("demo", ctx);

      expect(ctx.notifications.at(-1)?.[0]).toMatch(/An active workflow already exists/);
      expect(ctx.newSession).not.toHaveBeenCalled();
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

function activeStatePath(cwd: string, sessionId = "session-id"): string {
  return join(cwd, ".pi", "tmp", "workflows", "active", `${sessionId}.json`);
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
  registeredCommands: string[];
  handlers: Record<string, any[]>;
  sentUserMessages: Array<{ prompt: string; options: any }>;
  setModelCalls: any[];
  setThinkingLevelCalls: string[];
  registerCommand: (name: string, command: any) => void;
  on: (name: string, handler: any) => void;
  sendUserMessage: (prompt: string, options?: any) => void;
  setModel: (model: any) => Promise<boolean>;
  setThinkingLevel: (level: string) => void;
} {
  return {
    commands: {},
    registeredCommands: [],
    handlers: {},
    sentUserMessages: [],
    setModelCalls: [],
    setThinkingLevelCalls: [],
    registerCommand(name, command) {
      this.registeredCommands.push(name);
      this.commands[name] = command;
    },
    on(name, handler) {
      this.handlers[name] ??= [];
      this.handlers[name].push(handler);
    },
    sendUserMessage(prompt, options) {
      this.sentUserMessages.push({ prompt, options });
    },
    async setModel(model) {
      this.setModelCalls.push(model);
      return true;
    },
    setThinkingLevel(level) {
      this.setThinkingLevelCalls.push(level);
    },
  };
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
  overrides: Partial<{ newSession: any; sessionManager: any; modelRegistry: any }> = {},
): {
  cwd: string;
  notifications: Array<[string, string]>;
  ui: { notify: (message: string, level: string) => void };
  sessionManager: any;
  modelRegistry: any;
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
