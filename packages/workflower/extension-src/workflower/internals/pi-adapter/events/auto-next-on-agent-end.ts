import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { applyWorkflowStepRuntimeSettings } from "@pi-adapter/apply-workflow-step-runtime-settings";
import { advanceOnAutoNext } from "@orchestration/runtime/use-cases/auto-next/advance-on-auto-next";

export function registerAutoNextOnAgentEnd(pi: ExtensionAPI): void {
  pi.on("agent_end", async (_event, ctx) => {
    await advanceOnAutoNext(ctx, {
      applyStepRuntimeSettings: (step) => applyWorkflowStepRuntimeSettings(pi, ctx, step),
      sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
    });
  });
}
