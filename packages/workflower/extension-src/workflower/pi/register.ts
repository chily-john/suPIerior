import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { cancelWorkflow, showWorkflowStatus } from "@app/lifecycle";
import { advanceWorkflow } from "@app/next";
import { startWorkflow } from "@app/start";

const WORKFLOW_COMMANDS = "Available commands: start, status, cancel.";
const NEXT_USAGE = "Usage: /next";

export function registerWorkflowCommand(pi: ExtensionAPI): void {
  pi.registerCommand("workflow", {
    description: "Start and manage Workflower workflows",
    handler: async (args, ctx) => {
      const trimmedArgs = args.trim();
      const [subcommand = ""] = trimmedArgs.split(/\s+/, 1);

      if (subcommand === "status" && trimmedArgs === "status") {
        await showWorkflowStatus(ctx);
        return;
      }

      if (subcommand === "cancel" && trimmedArgs === "cancel") {
        await cancelWorkflow(ctx);
        return;
      }

      if (subcommand === "" || subcommand === "start") {
        await startWorkflow(args, ctx);
        return;
      }

      ctx.ui.notify(`Unknown workflow command: ${subcommand}. ${WORKFLOW_COMMANDS}`, "error");
    },
  });

  pi.registerCommand("next", {
    description: "Advance the active Workflower workflow to the next step",
    handler: async (args, ctx) => {
      if (args.trim() !== "") {
        ctx.ui.notify(NEXT_USAGE, "error");
        return;
      }

      await advanceWorkflow(ctx);
    },
  });
}
