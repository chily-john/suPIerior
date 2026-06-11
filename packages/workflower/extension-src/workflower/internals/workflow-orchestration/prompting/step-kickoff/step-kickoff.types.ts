import type { WorkflowStep } from "@package-api/workflow-definition.types";

export type StepKickoffPromptInput = {
  id: string;
  name: string;
  workdir: string;
  currentStepIndex: number;
  step: WorkflowStep;
  previousStep?: WorkflowStep;
};
