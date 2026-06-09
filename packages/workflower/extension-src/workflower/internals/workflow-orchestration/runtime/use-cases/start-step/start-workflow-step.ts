import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import { renderStepKickoffPrompt } from "@orchestration/prompting/step-kickoff/render-step-kickoff-prompt";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import type { CurrentSessionPromptSender } from "../workflow-runtime.types";

export async function startWorkflowStep(
  workflow: WorkflowDefinition,
  state: ActiveWorkflowState,
  stepIndex: number,
  promptSender: CurrentSessionPromptSender,
): Promise<boolean> {
  const step = workflow.steps[stepIndex];
  if (!step) return false;

  if (promptSender.applyStepRuntimeSettings) {
    const applied = await promptSender.applyStepRuntimeSettings(step);
    if (!applied) return false;
  }

  const kickoffPrompt = renderStepKickoffPrompt({
    id: workflow.id,
    name: state.name,
    workdir: state.workdir,
    currentStepIndex: stepIndex,
    step,
    previousStep: workflow.steps[stepIndex - 1],
  });

  await promptSender.sendUserMessage(kickoffPrompt);
  return true;
}
