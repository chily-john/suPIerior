import type {
  WorkflowDefinition,
  WorkflowRuntimeDefaults,
  WorkflowStep,
} from "@package-api/workflow-definition.types";

export type WorkflowNotificationLevel = "info" | "warning" | "error";

export type WorkflowNotificationUi = {
  notify(message: string, level?: WorkflowNotificationLevel): void;
};

export type WorkflowStepRuntimeSettings = {
  workflow: WorkflowDefinition;
  step: WorkflowStep;
  runtimeDefaults?: WorkflowRuntimeDefaults;
};

export type CurrentSessionPromptSender = {
  captureRuntimeDefaults?(): WorkflowRuntimeDefaults | undefined;
  applyStepRuntimeSettings?(settings: WorkflowStepRuntimeSettings): Promise<boolean> | boolean;
  restoreRuntimeDefaults?(runtimeDefaults?: WorkflowRuntimeDefaults): Promise<void> | void;
  sendUserMessage(prompt: string): Promise<void> | void;
};
