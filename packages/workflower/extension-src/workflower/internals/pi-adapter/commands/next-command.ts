import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  applyWorkflowStepRuntimeSettings,
  restoreWorkflowRuntimeDefaults,
} from "@pi-adapter/apply-workflow-step-runtime-settings";
import { advanceWorkflow } from "@orchestration/runtime/use-cases/advance/advance-workflow";
import { sendWorkflowerPrompt } from "../send-workflower-prompt";

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
        applyStepRuntimeSettings: (settings) => applyWorkflowStepRuntimeSettings(pi, ctx, settings),
        restoreRuntimeDefaults: (runtimeDefaults) =>
          restoreWorkflowRuntimeDefaults(pi, ctx, runtimeDefaults),
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt),
        sendWorkflowPrompt: (input) => sendWorkflowerPrompt(pi, input),
      });
    },
  });
}
