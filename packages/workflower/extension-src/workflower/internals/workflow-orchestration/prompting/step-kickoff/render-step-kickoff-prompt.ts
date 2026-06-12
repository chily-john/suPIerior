import { renderOutputPaths } from "./render-output-paths";
import type { StepKickoffPromptInput } from "./step-kickoff.types";

export function renderStepKickoffPrompt(input: StepKickoffPromptInput): string {
  const outputs = input.step.outputs ?? [];
  const outputLines = renderOutputPaths(input.workdir, outputs);
  const previousOutputLines = input.previousStep
    ? [
        "Previous step outputs:",
        renderOutputPaths(input.workdir, input.previousStep.outputs ?? []),
        "",
      ]
    : [];
  const incomingPollenLines = input.incomingPollen?.length
    ? ["Incoming pollen paths:", ...input.incomingPollen, ""]
    : [];

  return [
    "Start this Workflower workflow step.",
    "",
    `Workflow: ${input.id}`,
    `Name: ${input.name}`,
    `Workdir: ${input.workdir}`,
    `Current step ${input.currentStepIndex}: ${input.step.id}`,
    ...previousOutputLines,
    ...incomingPollenLines,
    "Expected outputs:",
    outputLines,
    "",
    `Execute this command: ${input.step.command}.`,
    " Previous and expected output paths are declared by the workflow and are resolved relative to the workdir.",
  ].join("\n");
}
