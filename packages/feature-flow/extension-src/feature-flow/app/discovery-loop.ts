import { askQuestion } from "@supierior/tui-tools";
import type { PiQuestionUi, QuestionAnswer, QuestionDefinition } from "@supierior/tui-tools";
import { createFeatureFlowStateController, type FeatureFlowStateController } from "@app/flow-state";
import type { FeatureFlowConfig } from "@domain/config";
import type { DiscoveryModelAdapter } from "@domain/discovery/adapter";
import { parseDiscoveryModelResponse } from "@domain/discovery/parse-response";
import {
  createInitialDiscoveryState,
  toDiscoveryAnswer,
  toQuestionDefinition,
} from "@domain/discovery/state";
import type { DiscoveryModelResponse, DiscoveryState } from "@domain/model";
import { renderDiscoveryPrompt, renderRepairDiscoveryPrompt } from "@templates/prompts";

export interface RunDiscoveryLoopInput {
  description: string;
  slug: string;
  ctx: {
    ui: PiQuestionUi & {
      notify?: (message: string, level?: "info" | "warning" | "error") => void;
    };
  };
  config: FeatureFlowConfig;
  modelAdapter: DiscoveryModelAdapter;
  flowState?: FeatureFlowStateController;
}

export async function runDiscoveryLoop(input: RunDiscoveryLoopInput): Promise<DiscoveryState> {
  const state = createInitialDiscoveryState(input.description, input.slug);
  const flowState = input.flowState ?? createFeatureFlowStateController(input.ctx.ui);
  let pendingSubmission: SubmittedAnswerContext | undefined;
  try {
    while (true) {
      const response = await flowState.busy(
        loadingContext("Analyzing feature discovery…", pendingSubmission),
        () =>
          completeAndParseWithRepair(
            input.modelAdapter,
            renderDiscoveryPrompt(state, input.config),
            input.config,
          ),
      );

      state.lastModelMessage = response.message;
      state.turns += 1;
      if (response.message) input.ctx.ui.notify?.(response.message, "info");

      if (response.readyToGenerate) break;
      const active = await flowState.rendering(
        loadingContext("Rendering next discovery prompt…", pendingSubmission),
        async () => {
          if (!response.question)
            throw new Error("Discovery model returned no question while not ready.");
          return toQuestionDefinition(response.question);
        },
      );

      const statusText = discoveryStatusText(state.answers.length + 1, input.config);
      input.ctx.ui.setStatus("feature-flow", statusText);
      pendingSubmission = undefined;
      flowState.inputReady(statusText);
      const answer = await askQuestion(input.ctx.ui, active);
      pendingSubmission = { question: active, answer };
      const record = await flowState.busy(
        loadingContext("Recording discovery answer…", pendingSubmission),
        () =>
          Promise.resolve({
            questionId: active.id,
            prompt: active.prompt,
            answer,
            summary: `${active.prompt}: ${String(answer)}`,
            recordInContext: active.recordInContext ?? true,
          }),
      );
      state.answers.push(toDiscoveryAnswer(record));
    }
    return state;
  } finally {
    input.ctx.ui.setStatus("feature-flow", undefined);
    if (!input.flowState) flowState.dispose();
  }
}

interface SubmittedAnswerContext {
  question: QuestionDefinition;
  answer: QuestionAnswer;
}

function loadingContext(message: string, submission: SubmittedAnswerContext | undefined) {
  return submission
    ? { message, question: submission.question, answer: submission.answer }
    : { message };
}

function discoveryStatusText(questionNumber: number, config: FeatureFlowConfig): string {
  const total = config.questions.maxQuestions;
  return typeof total === "number"
    ? `Discovery question ${questionNumber} of ${total}`
    : `Discovery question ${questionNumber}`;
}

async function completeAndParseWithRepair(
  adapter: DiscoveryModelAdapter,
  prompt: string,
  config: FeatureFlowConfig,
): Promise<DiscoveryModelResponse> {
  let output = await adapter.complete(prompt);
  for (let attempt = 0; attempt <= config.model.maxRepairAttempts; attempt += 1) {
    try {
      return parseDiscoveryModelResponse(output);
    } catch (error) {
      if (attempt >= config.model.maxRepairAttempts) throw error;
      output = await adapter.complete(
        renderRepairDiscoveryPrompt(output, error instanceof Error ? error.message : String(error)),
      );
    }
  }
  throw new Error("Discovery model response could not be parsed.");
}
