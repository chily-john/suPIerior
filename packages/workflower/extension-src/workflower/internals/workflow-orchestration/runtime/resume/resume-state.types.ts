import type { WorkflowRuntimeDefaults } from "@package-api/workflow-definition.types";

export type GardenResumeState = {
  version: 1;
  status: "active" | "paused" | "completed";
  sessionId: string;
  sessionFile?: string;
  workflowId: string;
  gardenName: string;
  gardenPath: string;
  activeFlowerName: string;
  activeFlowerPath: string;
  currentStepIndex: number;
  queuedWorkflowIds?: string[];
  contextBoundaryEntryId?: string | null;
  runtimeDefaults?: WorkflowRuntimeDefaults;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};
