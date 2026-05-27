import type { AnswerRecord, QuestionDefinition } from "@supierior/tui-tools";
import type { DiscoveryAnswer, DiscoveryQuestion, DiscoveryState } from "@domain/model";

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

export function toQuestionDefinition(question: DiscoveryQuestion): QuestionDefinition {
  return {
    id: question.id,
    kind: "text",
    prompt: question.text,
    recordInContext: true,
  };
}

export function toDiscoveryAnswer(record: AnswerRecord): DiscoveryAnswer {
  return {
    questionId: record.questionId,
    questionText: record.prompt,
    answer: String(record.answer),
  };
}
