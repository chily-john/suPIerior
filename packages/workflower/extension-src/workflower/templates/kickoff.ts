import { join } from "node:path";
import type { WorkflowStep } from "@domain/workflow";

export type KickoffPromptInput = {
  workflowId: string;
  type: string;
  name: string;
  workdir: string;
  currentStepIndex: number;
  step: WorkflowStep;
  previousStep?: WorkflowStep;
};

export function renderKickoffPrompt(input: KickoffPromptInput): string {
  const outputs = input.step.outputs ?? [];
  const outputLines = renderOutputLines(input.workdir, outputs);
  const previousOutputLines = input.previousStep
    ? [
        "Previous step outputs:",
        renderOutputLines(input.workdir, input.previousStep.outputs ?? []),
        "",
      ]
    : [];

  return [
    "Start this Workflower workflow step.",
    "",
    `Workflow: ${input.workflowId}`,
    `Type: ${input.type}`,
    `Name: ${input.name}`,
    `Workdir: ${input.workdir}`,
    `Current step ${input.currentStepIndex}: ${input.step.id}`,
    `Command: ${input.step.command}`,
    ...previousOutputLines,
    "Expected outputs:",
    outputLines,
    "",
    "Use the command above to execute this step in the workflow workdir. Previous and expected output paths are declared by the workflow and are resolved relative to the workdir.",
    "After the user verifies this step's outputs, use /next to advance to the next workflow step.",
  ].join("\n");
}

function renderOutputLines(workdir: string, outputs: string[]): string {
  return outputs.length > 0
    ? outputs.map((output) => `- ${join(workdir, output)}`).join("\n")
    : "- None declared";
}
