import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  applyWorkflowStepRuntimeSettings,
  captureWorkflowRuntimeDefaults,
  restoreWorkflowRuntimeDefaults,
} from "@pi-adapter/apply-workflow-step-runtime-settings";
import {
  listStartableWorkflows,
  onStartableWorkflowRegistered,
} from "@orchestration/runtime/use-cases/generated-starts/watch-startable-workflows";
import { startWorkflow } from "@orchestration/runtime/use-cases/start/start-workflow";
import { sendWorkflowerPrompt } from "../send-workflower-prompt";

export function registerGeneratedStartCommands(pi: ExtensionAPI): () => void {
  const registerStartCommand = (workflow: ReturnType<typeof listStartableWorkflows>[number]) => {
    pi.registerCommand(`wf:${workflow.id}`, {
      description: `Start Workflower workflow ${workflow.id}`,
      handler: async (args, ctx) => {
        await startWorkflow(
          workflow.id,
          args,
          ctx,
          {
            captureRuntimeDefaults: () => captureWorkflowRuntimeDefaults(pi, ctx),
            applyStepRuntimeSettings: (settings) =>
              applyWorkflowStepRuntimeSettings(pi, ctx, settings),
            restoreRuntimeDefaults: (runtimeDefaults) =>
              restoreWorkflowRuntimeDefaults(pi, ctx, runtimeDefaults),
            sendUserMessage: (prompt) => pi.sendUserMessage(prompt),
            sendWorkflowPrompt: (input) => sendWorkflowerPrompt(pi, input),
          },
          pi,
        );
      },
    });
  };

  for (const workflow of listStartableWorkflows()) registerStartCommand(workflow);
  return onStartableWorkflowRegistered(registerStartCommand);
}
