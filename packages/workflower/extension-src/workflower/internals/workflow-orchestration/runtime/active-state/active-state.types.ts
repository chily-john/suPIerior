export type ActiveWorkflowState = {
  sessionId: string;
  sessionFile?: string;
  id: string;
  name: string;
  workdir: string;
  currentStepIndex: number;
  contextBoundaryEntryId?: string | null;
  startedAt: string;
  updatedAt: string;
};
