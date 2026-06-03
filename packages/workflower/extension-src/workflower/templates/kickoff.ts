import { join } from "node:path";
import type { WorkflowStep } from "@domain/workflow";

export type KickoffPromptInput = {
  workflowId: string;
  type: string;
  name: string;
  workdir: string;
  currentStepIndex: number;
  step: WorkflowStep;
};

export function renderKickoffPrompt(input: KickoffPromptInput): string {
  const outputs = input.step.outputs ?? [];
  const outputLines =
    outputs.length > 0
      ? outputs.map((output) => `- ${join(input.workdir, output)}`).join("\n")
      : "- None declared";

  return [
    "Start this Workflower workflow step.",
    "",
    `Workflow: ${input.workflowId}`,
    `Type: ${input.type}`,
    `Name: ${input.name}`,
    `Workdir: ${input.workdir}`,
    `Current step ${input.currentStepIndex}: ${input.step.id}`,
    `Command: ${input.step.command}`,
    "Expected outputs:",
    outputLines,
    "",
    "Use the command above to execute this step in the workflow workdir. Keep all workflow artifacts inside the workdir unless the step explicitly requires otherwise.",
    "After the user verifies this step's outputs, use /next to advance to the next workflow step.",
  ].join("\n");
}
