import { askQuestion, beginQuestionLoading, QuestionQueue } from "@supierior/tui-tools";
import type { PiQuestionUi } from "@supierior/tui-tools";
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
}

export async function runDiscoveryLoop(input: RunDiscoveryLoopInput): Promise<DiscoveryState> {
  const state = createInitialDiscoveryState(input.description, input.slug);
  const queue = new QuestionQueue([], {
    phase: "Discovery",
    showAdjustmentIndicator: input.config.questions.showAdjustmentIndicator,
  });

  let stopLoading: (() => void) | undefined;
  try {
    while (true) {
      const response = await completeAndParseWithRepair(
        input.modelAdapter,
        renderDiscoveryPrompt(state, input.config),
        input.config,
      ).finally(() => {
        stopLoading?.();
        stopLoading = undefined;
      });

      state.lastModelMessage = response.message;
      state.turns += 1;
      if (response.message) input.ctx.ui.notify?.(response.message, "info");

      queue.rebase(response.questions.map(toQuestionDefinition));
      if (response.readyToGenerate) break;

      const active = queue.active;
      if (!active) throw new Error("Discovery model returned no active question while not ready.");

      input.ctx.ui.setStatus("feature-flow", queue.getProgress().statusText);
      const answer = await askQuestion(input.ctx.ui, active);
      stopLoading = beginQuestionLoading(input.ctx.ui);
      const record = await queue.resolveActive(answer);
      state.answers.push(toDiscoveryAnswer(record));
    }
    return state;
  } finally {
    stopLoading?.();
    input.ctx.ui.setStatus("feature-flow", undefined);
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
