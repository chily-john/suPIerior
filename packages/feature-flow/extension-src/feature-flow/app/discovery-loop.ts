import type { FeatureFlowStateController } from "@app/flow-state";
import type { FeatureFlowUi } from "@app/ui";
import type { FeatureFlowConfig } from "@domain/config";
import type { DiscoveryModelAdapter } from "@domain/discovery/adapter";
import { parseDiscoveryModelResponse } from "@domain/discovery/parse-response";
import { createInitialDiscoveryState } from "@domain/discovery/state";
import type { DiscoveryModelResponse, DiscoveryState } from "@domain/model";
import { renderDiscoveryPrompt, renderRepairDiscoveryPrompt } from "@templates/prompts";

export interface RunDiscoveryLoopInput {
  description: string;
  slug: string;
  ctx: {
    ui: FeatureFlowUi;
  };
  config: FeatureFlowConfig;
  modelAdapter: DiscoveryModelAdapter;
  flowState?: FeatureFlowStateController;
}

export async function runDiscoveryLoop(input: RunDiscoveryLoopInput): Promise<DiscoveryState> {
  const state = createInitialDiscoveryState(input.description, input.slug);

  try {
    while (true) {
      input.ctx.ui.setStatus("feature-flow", "Discovery");
      const response = await runWithDiscoveryLoading(input, () =>
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
      if (!response.question)
        throw new Error("Discovery model returned no question while not ready.");

      const status = formatDiscoveryStatus(response.estimatedNumberOfQuestionsRemaining);
      input.ctx.ui.setStatus("feature-flow", status);
      input.flowState?.inputReady(status);
      const answer =
        (await input.ctx.ui.input(response.question.text, "Answer feature discovery question")) ??
        "";
      state.answers.push({
        questionId: response.question.id,
        questionText: response.question.text,
        answer,
      });
    }
    return state;
  } finally {
    input.ctx.ui.setStatus("feature-flow", undefined);
  }
}

function formatDiscoveryStatus(estimatedRemaining: number | undefined): string {
  if (estimatedRemaining === undefined) return "Discovery";
  return `Discovery · ${estimatedRemaining} remaining`;
}

async function runWithDiscoveryLoading<T>(
  input: RunDiscoveryLoopInput,
  work: () => Promise<T>,
): Promise<T> {
  if (!input.flowState) return work();
  return input.flowState.busy("Analyzing feature discovery…", work);
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
