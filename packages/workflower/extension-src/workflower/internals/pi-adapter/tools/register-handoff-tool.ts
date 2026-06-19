import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import {
  applyWorkflowStepRuntimeSettings,
  restoreWorkflowRuntimeDefaults,
} from "@pi-adapter/apply-workflow-step-runtime-settings";
import { handoffWorkflowById } from "@orchestration/runtime/use-cases/handoff/handoff-workflow-by-id";
import {
  hasHandoffDuringTurn,
  markHandoffDuringTurn,
} from "../workflow-handoff-turn-guard";

export function registerHandoffTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "workflower_handoff",
    label: "Workflower Handoff",
    description: "Hand off the active Workflower garden to another registered workflow.",
    promptSnippet: "Hand off the active Workflower garden to another registered workflow by id.",
    promptGuidelines: [
      "Use workflower_handoff when a Workflower step must continue by starting another workflow in the active garden.",
      "Do not print /wf commands when a workflow handoff is required; call workflower_handoff instead.",
    ],
    parameters: Type.Object({
      workflowId: Type.String({
        description: "Registered workflow id to start as the next flower in the active garden.",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (hasHandoffDuringTurn(ctx.cwd, ctx.sessionManager.getSessionId())) {
        const result = {
          ok: false,
          message: "A Workflower handoff already occurred during this agent turn.",
        };
        return {
          content: [{ type: "text", text: result.message }],
          details: result,
        };
      }

      const result = await handoffWorkflowById(params.workflowId, ctx, {
        applyStepRuntimeSettings: (settings) =>
          applyWorkflowStepRuntimeSettings(pi, ctx, settings),
        restoreRuntimeDefaults: (runtimeDefaults) =>
          restoreWorkflowRuntimeDefaults(pi, ctx, runtimeDefaults),
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
      });

      if (result.ok) markHandoffDuringTurn(ctx.cwd, ctx.sessionManager.getSessionId(), result.source);

      return {
        content: [{ type: "text", text: result.message }],
        details: result,
      };
    },
  });
}
