import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { startWorkflow } from "@app/start";

export function registerWorkflowCommand(pi: ExtensionAPI): void {
  pi.registerCommand("workflow", {
    description: "Start and manage Workflower workflows",
    handler: async (args, ctx) => {
      await startWorkflow(args, ctx);
    },
  });
}
