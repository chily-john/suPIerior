import type { WorkflowerPromptDisplay } from "./workflow-prompt-display.types";

export type WorkflowPromptDisplayInput = {
  workflowId: string;
  workflowName?: string;
};

export type StepPromptDisplayInput = WorkflowPromptDisplayInput & {
  stepId: string;
  stepIndex?: number;
};

export function createWorkflowPromptDisplay(
  input: WorkflowPromptDisplayInput,
): WorkflowerPromptDisplay {
  return {
    kind: "workflow",
    label: formatWorkflowPromptLabel(input),
    workflowId: input.workflowId,
    ...optionalWorkflowName(input.workflowName),
  };
}

export function createStepPromptDisplay(input: StepPromptDisplayInput): WorkflowerPromptDisplay {
  return {
    kind: "step",
    label: formatStepPromptLabel(input.stepId),
    workflowId: input.workflowId,
    ...optionalWorkflowName(input.workflowName),
    stepId: input.stepId,
    ...optionalStepIndex(input.stepIndex),
  };
}

function formatWorkflowPromptLabel(input: WorkflowPromptDisplayInput): string {
  if (!input.workflowName) {
    return `Workflow: ${input.workflowId}`;
  }

  return `Workflow: ${input.workflowId} — ${input.workflowName}`;
}

function formatStepPromptLabel(stepId: string): string {
  return `Step: ${stepId}`;
}

function optionalWorkflowName(
  workflowName: string | undefined,
): Pick<WorkflowerPromptDisplay, "workflowName"> {
  return workflowName === undefined ? {} : { workflowName };
}

function optionalStepIndex(
  stepIndex: number | undefined,
): Pick<WorkflowerPromptDisplay, "stepIndex"> {
  return stepIndex === undefined ? {} : { stepIndex };
}
