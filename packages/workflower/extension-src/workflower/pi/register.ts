import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { advanceWorkflow } from "@app/next";
import { startWorkflow } from "@app/start";

export function registerWorkflowCommand(pi: ExtensionAPI): void {
  pi.registerCommand("workflow", {
    description: "Start and manage Workflower workflows",
    handler: async (args, ctx) => {
      await startWorkflow(args, ctx);
    },
  });

  pi.registerCommand("next", {
    description: "Advance the active Workflower workflow to the next step",
    handler: async (_args, ctx) => {
      await advanceWorkflow(ctx);
    },
  });
}
