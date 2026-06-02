import { createQuestionSession } from "@supierior/tui-tools";
import type { PiQuestionUi } from "@supierior/tui-tools";
import type { FeatureFlowStateController } from "@app/flow-state";
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
  const questions = createQuestionSession(input.ctx.ui, {
    phase: "Discovery",
    statusKey: "feature-flow",
    loadingMessage: "Analyzing feature discovery…",
  });

  try {
    while (true) {
      questions.setLoading("Analyzing feature discovery…");
      const response = await completeAndParseWithRepair(
        input.modelAdapter,
        renderDiscoveryPrompt(state, input.config),
        input.config,
      );

      state.lastModelMessage = response.message;
      state.turns += 1;
      if (response.message) input.ctx.ui.notify?.(response.message, "info");

      if (response.readyToGenerate) break;
      if (!response.question)
        throw new Error("Discovery model returned no question while not ready.");

      const record = await questions.ask(toQuestionDefinition(response.question), {
        estimatedRemaining: response.estimatedNumberOfQuestionsRemaining,
      });
      state.answers.push(toDiscoveryAnswer(record));
    }
    return state;
  } finally {
    questions.dispose();
  }
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
