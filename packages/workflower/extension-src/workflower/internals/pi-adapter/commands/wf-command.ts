import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { listWorkflowStates } from "@orchestration/runtime/use-cases/manage-active/list-active";
import { showWorkflowStatus } from "@orchestration/runtime/use-cases/manage-active/show-status";
import { stopWorkflow } from "@orchestration/runtime/use-cases/manage-active/stop-active";

const WF_COMMANDS = "Available commands: status, stop, list.";

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

      const [subcommand = ""] = trimmedArgs.split(/\s+/, 1);
      ctx.ui.notify(`Unknown wf command: ${subcommand}. ${WF_COMMANDS}`, "error");
    },
  });
}
