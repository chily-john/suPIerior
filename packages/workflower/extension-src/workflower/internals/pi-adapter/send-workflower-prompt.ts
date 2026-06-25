import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { WorkflowerPromptDisplay } from "@orchestration/prompting/workflow-prompt-display.types";

export type SendWorkflowerPromptInput = {
  prompt: string;
  display: WorkflowerPromptDisplay;
  deliverAs?: "steer" | "followUp" | "nextTurn";
};

export function sendWorkflowerPrompt(pi: ExtensionAPI, input: SendWorkflowerPromptInput): void {
  pi.sendMessage(
    {
      customType: "workflower-prompt",
      content: input.prompt,
      display: true,
      details: input.display,
    },
    input.deliverAs ? { triggerTurn: true, deliverAs: input.deliverAs } : { triggerTurn: true },
  );
}
