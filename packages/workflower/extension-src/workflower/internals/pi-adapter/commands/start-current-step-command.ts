import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { findWorkflow } from "@orchestration/definitions/registry/global-registry";
import { resolveActiveStatePath } from "@orchestration/runtime/active-state/active-state-paths";
import { readActiveWorkflowState } from "@orchestration/runtime/active-state/active-state-store";
import { startWorkflowStep } from "@orchestration/runtime/use-cases/start-step/start-workflow-step";
import { applyWorkflowStepRuntimeSettings } from "@pi-adapter/apply-workflow-step-runtime-settings";

export const START_CURRENT_STEP_COMMAND = "wf-start-current-step";

export function registerStartCurrentStepCommand(pi: ExtensionAPI): void {
  pi.registerCommand(START_CURRENT_STEP_COMMAND, {
    description: "Internal Workflower command: start the active workflow step",
    handler: async (args, ctx) => {
      if (args.trim() !== "") {
        ctx.ui.notify(`Usage: /${START_CURRENT_STEP_COMMAND}`, "error");
        return;
      }

      const activeStatePath = resolveActiveStatePath(ctx.cwd, ctx.sessionManager.getSessionId());
      const state = await readActiveWorkflowState(activeStatePath).catch(() => undefined);
      if (!state) {
        ctx.ui.notify("No active workflow.", "info");
        return;
      }

      const workflow = findWorkflow(state.id);
      if (!workflow) {
        ctx.ui.notify(`Active workflow definition not found: ${state.id}.`, "error");
        return;
      }

      const sent = await startWorkflowStep(workflow, state, state.currentStepIndex, {
        applyStepRuntimeSettings: (step) => applyWorkflowStepRuntimeSettings(pi, ctx, step),
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt),
      });
      if (sent) ctx.ui.notify(`Started workflow ${workflow.id} as ${state.name}.`, "info");
    },
  });
}
