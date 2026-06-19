import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  applyWorkflowStepRuntimeSettings,
  restoreWorkflowRuntimeDefaults,
} from "@pi-adapter/apply-workflow-step-runtime-settings";
import { advanceOnAutoNext } from "@orchestration/runtime/use-cases/auto-next/advance-on-auto-next";
import { consumeHandoffAutoNextSuppressionForState } from "../workflow-handoff-turn-guard";

export function registerAutoNextOnAgentEnd(pi: ExtensionAPI): void {
  pi.on("agent_end", async (_event, ctx) => {
    await advanceOnAutoNext(
      ctx,
      {
        applyStepRuntimeSettings: (settings) =>
          applyWorkflowStepRuntimeSettings(pi, ctx, settings),
        restoreRuntimeDefaults: (runtimeDefaults) =>
          restoreWorkflowRuntimeDefaults(pi, ctx, runtimeDefaults),
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
      },
      {
        shouldSuppressAutoNext: (state) =>
          consumeHandoffAutoNextSuppressionForState(
            ctx.cwd,
            ctx.sessionManager.getSessionId(),
            state,
          ),
      },
    );
  });
}
