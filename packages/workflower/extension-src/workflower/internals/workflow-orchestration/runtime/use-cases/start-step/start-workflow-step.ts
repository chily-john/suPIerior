import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import { renderStepKickoffPrompt } from "@orchestration/prompting/step-kickoff/render-step-kickoff-prompt";
import {
  createStepPromptDisplay,
  createWorkflowPromptDisplay,
} from "@orchestration/prompting/workflow-prompt-display";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import type { CurrentSessionPromptSender, WorkflowNotificationUi } from "../workflow-runtime.types";
import { resolveWorkflowerStepCommand } from "./resolve-workflow-step-command";
import { updateWorkflowStatus } from "../workflow-status";
import { startStepMetrics } from "@/runtime/artifacts/step-metrics-hook";

export async function startWorkflowStep(
  workflow: WorkflowDefinition,
  state: ActiveWorkflowState,
  stepIndex: number,
  promptSender: CurrentSessionPromptSender,
  options: {
    cwd?: string;
    incomingPollen?: string[];
    signal?: AbortSignal;
    promptDisplayKind?: "workflow" | "step";
    retryNotice?: string;
    ui?: WorkflowNotificationUi;
  } = {},
): Promise<boolean> {
  const step = workflow.steps[stepIndex];
  if (!step) return false;

  // Hook: Start metrics collection for this step if enabled
  const workflowerRoot = options.cwd ?? process.cwd();
  const flowerPath = state.activeFlowerPath ?? state.workdir;
  await startStepMetrics(flowerPath, stepIndex, step.id, workflow, step, state, workflowerRoot);

  if (promptSender.applyStepRuntimeSettings) {
    const applied = await promptSender.applyStepRuntimeSettings({
      workflow,
      step,
      runtimeDefaults: state.runtimeDefaults,
    });
    if (!applied) return false;
  }

  const commandResolution = await resolveWorkflowerStepCommand(step, {
    workflowId: workflow.id,
    workflowName: state.name,
    gardenName: state.gardenName ?? state.name,
    cwd: options.cwd ?? process.cwd(),
    signal: options.signal,
  });

  const kickoffPrompt = renderStepKickoffPrompt({
    id: workflow.id,
    name: state.name,
    workdir: state.activeFlowerPath ?? state.workdir,
    currentStepIndex: stepIndex,
    step,
    previousStep: workflow.steps[stepIndex - 1],
    incomingPollen: workflow.acceptPollen === false ? undefined : options.incomingPollen,
    commandResolution,
    retryNotice: options.retryNotice,
  });

  const display =
    options.promptDisplayKind === "workflow"
      ? createWorkflowPromptDisplay({
          workflowId: workflow.id,
          workflowName: state.name,
        })
      : createStepPromptDisplay({
          workflowId: workflow.id,
          workflowName: state.name,
          stepId: step.id,
          stepIndex,
        });

  // Set footer status to workflow and step id
  if (options.ui) {
    updateWorkflowStatus(options.ui, workflow.id, step.id);
  }

  if (promptSender.sendWorkflowPrompt) {
    await promptSender.sendWorkflowPrompt({ prompt: kickoffPrompt, display });
  } else {
    await promptSender.sendUserMessage(kickoffPrompt);
  }

  return true;
}
