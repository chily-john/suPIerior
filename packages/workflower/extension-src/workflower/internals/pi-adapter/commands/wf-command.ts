import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createWorkflowerRuntime } from "@package-api/create-workflower-runtime";
import type { JsonValue } from "@package-api/garden-state.types";
import type { WorkflowerRuntimeContext } from "@package-api/workflower-runtime.types";
import { listWorkflowStates } from "@orchestration/runtime/use-cases/manage-active/list-active";
import { showWorkflowStatus } from "@orchestration/runtime/use-cases/manage-active/show-status";
import { stopWorkflow } from "@orchestration/runtime/use-cases/manage-active/stop-active";

const WF_COMMANDS = "Available commands: status, stop, list, state.";
const WF_STATE_USAGE =
  'Usage: /wf state list | /wf state get <key> | /wf state set <key> <json-value>. Examples: /wf state set review.rating 4, /wf state set review.summary "Needs tests".';

export function registerWfCommand(pi: ExtensionAPI): void {
  pi.registerCommand("wf", {
    description: "Inspect and stop the active Workflower workflow",
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

      if (trimmedArgs === "state" || trimmedArgs.startsWith("state ")) {
        await handleStateCommand(pi, ctx, trimmedArgs.slice("state".length).trim());
        return;
      }

      const [subcommand = ""] = trimmedArgs.split(/\s+/, 1);
      ctx.ui.notify(`Unknown wf command: ${subcommand}. ${WF_COMMANDS}`, "error");
    },
  });
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
