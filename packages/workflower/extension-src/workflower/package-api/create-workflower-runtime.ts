import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { handoffWorkflowById } from "@orchestration/runtime/use-cases/handoff/handoff-workflow-by-id";
import { getGardenStateValue } from "@orchestration/runtime/use-cases/garden-state/get-garden-state-value";
import { listGardenStateValues } from "@orchestration/runtime/use-cases/garden-state/list-garden-state-values";
import { setGardenStateValue } from "@orchestration/runtime/use-cases/garden-state/set-garden-state-value";
import { sendWorkflowerPrompt } from "@pi-adapter/send-workflower-prompt";
import {
  applyWorkflowStepRuntimeSettings,
  restoreWorkflowRuntimeDefaults,
} from "./workflow-runtime-settings";
import type {
  WorkflowerRuntime,
  WorkflowerRuntimeContext,
  WorkflowerRuntimeOptions,
} from "./workflower-runtime.types";

export function createWorkflowerRuntime(
  pi: ExtensionAPI,
  ctx: WorkflowerRuntimeContext,
  options: WorkflowerRuntimeOptions = {},
): WorkflowerRuntime {
  return {
    state: {
      get: (key) => getGardenStateValue(ctx, key),
      async getValue(key) {
        const result = await getGardenStateValue(ctx, key);
        return result.ok && result.found ? result.entry?.value : undefined;
      },
      set: (key, value) => setGardenStateValue(ctx, key, value),
      list: () => listGardenStateValues(ctx),
    },

    handoff: (workflowId) =>
      handoffWorkflowById(workflowId, ctx, {
        applyStepRuntimeSettings: (settings) => applyWorkflowStepRuntimeSettings(pi, ctx, settings),
        restoreRuntimeDefaults: (runtimeDefaults) =>
          restoreWorkflowRuntimeDefaults(pi, ctx, runtimeDefaults),
        sendUserMessage: options.sendUserMessage ?? ((prompt) => pi.sendUserMessage(prompt)),
        ...(options.sendUserMessage
          ? {}
          : { sendWorkflowPrompt: (input) => sendWorkflowerPrompt(pi, input) }),
      }),
  };
}
