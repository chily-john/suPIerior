import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createWorkflowerRuntime } from "@package-api/create-workflower-runtime";
import {
  applyWorkflowStepRuntimeSettings,
  captureWorkflowRuntimeDefaults,
  restoreWorkflowRuntimeDefaults,
} from "@pi-adapter/apply-workflow-step-runtime-settings";
import type { JsonValue } from "@package-api/garden-state.types";
import type { WorkflowerRuntimeContext } from "@package-api/workflower-runtime.types";
import { findActiveWorkflowInGarden } from "@orchestration/runtime/active-state/find-active-workflow-in-garden";
import { removeWorkflowWorkdir } from "@orchestration/runtime/artifacts/remove-artifacts";
import { isSafeWorkflowName as isSafeGardenName } from "@orchestration/runtime/artifacts/workflow-name-validation";
import { listWorkflowStates } from "@orchestration/runtime/use-cases/manage-active/list-active";
import { showWorkflowStatus } from "@orchestration/runtime/use-cases/manage-active/show-status";
import { stopWorkflow } from "@orchestration/runtime/use-cases/manage-active/stop-active";
import { resumeWorkflow } from "@orchestration/runtime/use-cases/resume/resume-workflow";
import { resolveWorkflowsRoot } from "@orchestration/runtime/workflower-home";
import { sendWorkflowerPrompt } from "../send-workflower-prompt";
import { handleConfigCommand } from "@/commands/config";

const WF_COMMANDS = "Available commands: status, stop, list, clean, state, resume, config.";
const WF_STATE_USAGE =
  'Usage: /wf state list | /wf state get <key> | /wf state set <key> <json-value>. Examples: /wf state set review.rating 4, /wf state set review.summary "Needs tests".';
const WF_CONFIG_USAGE = 'Usage: /wf config';

export function registerWfCommand(pi: ExtensionAPI): void {
  pi.registerCommand("wf", {
    description: "Inspect, resume, and stop Workflower workflows",
    handler: async (args, ctx) => {
      const trimmedArgs = args.trim();

      if (trimmedArgs === "status") {
        await showWorkflowStatus(ctx);
        return;
      }

      if (trimmedArgs === "stop") {
        await stopWorkflow(ctx);
        return;
      }

      if (trimmedArgs === "list") {
        await listWorkflowStates(ctx);
        return;
      }

      if (trimmedArgs === "clean" || trimmedArgs.startsWith("clean ")) {
        await cleanWorkflowGarden(ctx, trimmedArgs.slice("clean".length).trim());
        return;
      }

      if (trimmedArgs === "resume" || trimmedArgs.startsWith("resume ")) {
        await resumeWorkflow(trimmedArgs.slice("resume".length).trim(), ctx, {
          captureRuntimeDefaults: () => captureWorkflowRuntimeDefaults(pi, ctx),
          applyStepRuntimeSettings: (settings) =>
            applyWorkflowStepRuntimeSettings(pi, ctx, settings),
          restoreRuntimeDefaults: (runtimeDefaults) =>
            restoreWorkflowRuntimeDefaults(pi, ctx, runtimeDefaults),
          sendUserMessage: (prompt) => pi.sendUserMessage(prompt),
          sendWorkflowPrompt: (input) => sendWorkflowerPrompt(pi, input),
        });
        return;
      }

      if (trimmedArgs === "state" || trimmedArgs.startsWith("state ")) {
        await handleStateCommand(pi, ctx, trimmedArgs.slice("state".length).trim());
        return;
      }

      if (trimmedArgs === "config" || trimmedArgs.startsWith("config ")) {
        await handleConfigCommand(trimmedArgs.slice("config".length).trim(), ctx);
        return;
      }

      const [subcommand = ""] = trimmedArgs.split(/\s+/, 1);
      ctx.ui.notify(`Unknown wf command: ${subcommand}. ${WF_COMMANDS}`, "error");
    },
  });
}

async function cleanWorkflowGarden(
  ctx: WorkflowerRuntimeContext,
  gardenName: string,
): Promise<void> {
  if (!gardenName) {
    ctx.ui.notify("Usage: /wf clean <garden-name>", "error");
    return;
  }

  if (!isSafeGardenName(gardenName)) {
    ctx.ui.notify("Invalid garden-name: garden-name must be a safe path segment.", "error");
    return;
  }

  const activeWorkflow = await findActiveWorkflowInGarden(ctx.cwd, gardenName);
  if (activeWorkflow) {
    ctx.ui.notify(
      `Refusing to clean active garden ${gardenName}; workflow ${activeWorkflow.id} is still active in session ${activeWorkflow.sessionId}.`,
      "error",
    );
    return;
  }

  try {
    await removeWorkflowWorkdir(ctx.cwd, join(resolveWorkflowsRoot(ctx.cwd), gardenName));
    ctx.ui.notify(`Removed Workflower garden ${gardenName}.`, "info");
  } catch (error) {
    ctx.ui.notify(`Failed to clean garden ${gardenName}: ${formatError(error)}`, "error");
  }
}

async function handleStateCommand(
  pi: ExtensionAPI,
  ctx: WorkflowerRuntimeContext,
  args: string,
): Promise<void> {
  const runtime = createWorkflowerRuntime(pi, ctx);

  if (args === "list") {
    const result = await runtime.state.list();
    if (!result.ok) {
      ctx.ui.notify(result.message, "error");
      return;
    }

    ctx.ui.notify(
      result.keys.length === 0
        ? "No garden state keys are set."
        : `Garden state keys: ${result.keys.join(", ")}`,
      "info",
    );
    return;
  }

  const getMatch = /^get\s+(\S+)$/.exec(args);
  if (getMatch) {
    const [, key] = getMatch;
    const result = await runtime.state.get(key);
    if (!result.ok) {
      ctx.ui.notify(result.message, "error");
      return;
    }

    ctx.ui.notify(
      result.found
        ? `Garden state ${key}: ${JSON.stringify(result.entry?.value)}`
        : `Garden state key ${key} is not set.`,
      "info",
    );
    return;
  }

  const setMatch = /^set\s+(\S+)\s+([\s\S]+)$/.exec(args);
  if (setMatch) {
    const [, key, jsonSource] = setMatch;
    let value: JsonValue;
    try {
      value = JSON.parse(jsonSource) as JsonValue;
    } catch {
      ctx.ui.notify(`Invalid JSON value. ${WF_STATE_USAGE}`, "error");
      return;
    }

    const result = await runtime.state.set(key, value);
    ctx.ui.notify(result.message, result.ok ? "info" : "error");
    return;
  }

  ctx.ui.notify(WF_STATE_USAGE, "error");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
