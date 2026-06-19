import type { WorkflowRuntimeDefaults } from "@package-api/workflow-definition.types";

export type ActiveWorkflowState = {
  sessionId: string;
  sessionFile?: string;
  id: string;
  name: string;
  gardenName?: string;
  gardenPath?: string;
  activeFlowerName?: string;
  activeFlowerPath?: string;
  workdir: string;
  currentStepIndex: number;
  contextBoundaryEntryId?: string | null;
  runtimeDefaults?: WorkflowRuntimeDefaults;
  startedAt: string;
  updatedAt: string;
};
