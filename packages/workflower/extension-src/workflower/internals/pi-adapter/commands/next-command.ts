import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { applyWorkflowStepRuntimeSettings } from "@pi-adapter/apply-workflow-step-runtime-settings";
import { advanceWorkflow } from "@orchestration/runtime/use-cases/advance/advance-workflow";

const NEXT_USAGE = "Usage: /next";

export function registerNextCommand(pi: ExtensionAPI): void {
  pi.registerCommand("next", {
    description: "Advance the active Workflower workflow to the next step",
    handler: async (args, ctx) => {
      if (args.trim() !== "") {
        ctx.ui.notify(NEXT_USAGE, "error");
        return;
      }

      await advanceWorkflow(ctx, {
        applyStepRuntimeSettings: (step) => applyWorkflowStepRuntimeSettings(pi, ctx, step),
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt),
      });
    },
  });
}
