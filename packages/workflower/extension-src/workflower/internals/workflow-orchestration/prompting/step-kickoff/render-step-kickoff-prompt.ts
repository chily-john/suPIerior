import type { WorkflowerStepCommandResolution } from "@orchestration/definitions/private-commands/private-command-resolution.types";
import { expandPrivateSkillCommand } from "../private-skills/expand-private-skill-command";
import { renderOutputPaths } from "./render-output-paths";
import type { StepKickoffPromptInput } from "./step-kickoff.types";

export function renderStepKickoffPrompt(input: StepKickoffPromptInput): string {
  const outputs = input.step.outputs ?? [];
  const outputLines = renderOutputPaths(input.workdir, outputs);
  const commandLines = renderStepCommandLines(input.step.command, input.commandResolution);
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
    ...commandLines,
    " Previous and expected output paths are declared by the workflow and are resolved relative to the workdir.",
  ].join("\n");
}

function renderStepCommandLines(
  command: string,
  commandResolution?: WorkflowerStepCommandResolution,
): string[] {
  if (commandResolution?.kind === "private-skill-prompt") {
    return [
      "Execute this Workflower private skill for the current workflow step:",
      "",
      commandResolution.content,
    ];
  }

  if (commandResolution?.kind === "private-command-prompt") {
    return [
      "Execute this Workflower private command for the current workflow step:",
      "",
      commandResolution.content,
    ];
  }

  if (commandResolution?.kind === "private-command-none") {
    return [];
  }

  const expandedPrivateSkill = expandPrivateSkillCommand(command);

  if (expandedPrivateSkill) {
    return [
      "Execute this Workflower private skill for the current workflow step:",
      "",
      expandedPrivateSkill,
    ];
  }

  return [`Execute this command: ${command}.`];
}
