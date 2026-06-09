import type { WorkflowStep } from "@package-api/workflow-definition.types";

export type WorkflowNotificationLevel = "info" | "warning" | "error";

export type WorkflowNotificationUi = {
  notify(message: string, level?: WorkflowNotificationLevel): void;
};

export type CurrentSessionPromptSender = {
  applyStepRuntimeSettings?(step: WorkflowStep): Promise<boolean> | boolean;
  sendUserMessage(prompt: string): Promise<void> | void;
};
