import type { DiscoveryState } from "@domain/model";

export type FeatureFlowPhase = "input-ready" | "busy" | "rendering" | "complete";

export interface FeatureFlowState {
  phase: FeatureFlowPhase;
  /** True when the flow is processing and the user should not provide input. */
  isProcessing: boolean;
  message?: string;
}

export function createInitialFeatureFlowState(): FeatureFlowState {
  return transitionFeatureFlowState({ phase: "input-ready", isProcessing: false }, "input-ready");
}

export function transitionFeatureFlowState(
  _state: FeatureFlowState,
  phase: FeatureFlowPhase,
  message?: string,
): FeatureFlowState {
  return { phase, isProcessing: phase === "busy" || phase === "rendering", message };
}

export function isFeatureFlowProcessing(state: FeatureFlowState): boolean {
  return state.isProcessing;
}

export function createInitialDiscoveryState(description: string, slug: string): DiscoveryState {
  return { description, slug, answers: [], turns: 0 };
}
