import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { findWorkflow } from "@domain/registry";
import { isSafeWorkflowName, resolveWorkflowPaths } from "@domain/paths";
import { writeActiveWorkflowState, type ActiveWorkflowState } from "@domain/state";
import { renderKickoffPrompt } from "@templates/kickoff";

export const WORKFLOW_START_USAGE = "Usage: /workflow start <workflow-id> <workflow-name>";

export type WorkflowCommandContext = {
  cwd: string;
  ui: { notify(message: string, level?: "info" | "warning" | "error"): void };
  newSession(options: {
    withSession(ctx: { sendUserMessage(prompt: string): Promise<void> }): Promise<void>;
  }): Promise<{ cancelled?: boolean }>;
};

export async function startWorkflow(args: string, ctx: WorkflowCommandContext): Promise<void> {
  const parsed = parseWorkflowStartArgs(args);
  if (!parsed.ok) {
    ctx.ui.notify(parsed.message, "error");
    return;
  }

  const workflow = findWorkflow(parsed.workflowId);
  if (!workflow) {
    ctx.ui.notify(`Unknown workflow id: ${parsed.workflowId}`, "error");
    return;
  }

  if (!isSafeWorkflowName(parsed.workflowName)) {
    ctx.ui.notify("Invalid workflow-name: workflow-name must be a safe path segment.", "error");
    return;
  }

  const paths = resolveWorkflowPaths(ctx.cwd, workflow.type, parsed.workflowName);
  if (await exists(paths.activeStatePath)) {
    ctx.ui.notify(`An active workflow already exists at ${paths.activeStatePath}.`, "error");
    return;
  }

  const now = new Date().toISOString();
  const state: ActiveWorkflowState = {
    workflowId: workflow.id,
    type: workflow.type,
    name: parsed.workflowName,
    workdir: paths.workdir,
    currentStepIndex: 0,
    startedAt: now,
    updatedAt: now,
  };
  const kickoffPrompt = renderKickoffPrompt({
    workflowId: workflow.id,
    type: workflow.type,
    name: parsed.workflowName,
    workdir: paths.workdir,
    currentStepIndex: 0,
    step: workflow.steps[0],
  });

  try {
    await mkdir(paths.workdir, { recursive: true });
    await writeFile(join(paths.workdir, ".keep"), "", "utf8");
    await writeActiveWorkflowState(paths.activeStatePath, state);
  } catch (error) {
    ctx.ui.notify(`Failed to prepare workflow files: ${formatError(error)}`, "error");
    return;
  }

  try {
    const result = await ctx.newSession({
      withSession: async (replacementCtx) => {
        await replacementCtx.sendUserMessage(kickoffPrompt);
      },
    });
    if (result.cancelled) {
      ctx.ui.notify(
        "Session creation was cancelled before the workflow kickoff prompt could be sent.",
        "error",
      );
      return;
    }
  } catch (error) {
    ctx.ui.notify(`Session creation failed: ${formatError(error)}`, "error");
    return;
  }

  ctx.ui.notify(`Started workflow ${workflow.id} as ${parsed.workflowName}.`, "info");
}

type ParsedStartArgs =
  | { ok: true; workflowId: string; workflowName: string }
  | { ok: false; message: string };

function parseWorkflowStartArgs(args: string): ParsedStartArgs {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ok: false, message: WORKFLOW_START_USAGE };
  const [subcommand, workflowId, workflowName, ...extra] = parts;
  if (subcommand !== "start")
    return {
      ok: false,
      message: `Unknown workflow command: ${subcommand}. ${WORKFLOW_START_USAGE}`,
    };
  if (!workflowId || !workflowName || extra.length > 0)
    return { ok: false, message: WORKFLOW_START_USAGE };
  return { ok: true, workflowId, workflowName };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
