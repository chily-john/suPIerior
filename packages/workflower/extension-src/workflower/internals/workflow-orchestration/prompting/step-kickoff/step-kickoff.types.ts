import type { WorkflowStep } from "@package-api/workflow-definition.types";
import type { WorkflowerStepCommandResolution } from "@orchestration/definitions/private-commands/private-command-resolution.types";

export type StepKickoffPromptInput = {
  id: string;
  name: string;
  workdir: string;
  currentStepIndex: number;
  step: WorkflowStep;
  previousStep?: WorkflowStep;
  incomingPollen?: string[];
  commandResolution?: WorkflowerStepCommandResolution;
};
