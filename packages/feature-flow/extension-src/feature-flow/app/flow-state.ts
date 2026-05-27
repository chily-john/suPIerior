import { beginQuestionLoading } from "@supierior/tui-tools";
import type { PiQuestionUi } from "@supierior/tui-tools";
import {
  createInitialFeatureFlowState,
  isFeatureFlowProcessing,
  transitionFeatureFlowState,
  type FeatureFlowPhase,
  type FeatureFlowState,
} from "@domain/discovery/state";

export interface FeatureFlowStateController {
  readonly current: FeatureFlowState;
  setPhase(phase: FeatureFlowPhase, message?: string): FeatureFlowState;
  inputReady(message?: string): FeatureFlowState;
  busy<T>(message: string, work: () => Promise<T>): Promise<T>;
  rendering<T>(message: string, work: () => Promise<T>): Promise<T>;
  complete(message?: string): FeatureFlowState;
  dispose(): void;
}

export function createFeatureFlowStateController(ui: PiQuestionUi): FeatureFlowStateController {
  let state = createInitialFeatureFlowState();
  let stopBusy: (() => void) | undefined;

  const apply = (phase: FeatureFlowPhase, message?: string): FeatureFlowState => {
    const next = transitionFeatureFlowState(state, phase, message);
    const wasProcessing = isFeatureFlowProcessing(state);
    const isProcessing = isFeatureFlowProcessing(next);

    if (
      wasProcessing &&
      (!isProcessing || state.message !== next.message || state.phase !== next.phase)
    ) {
      stopBusy?.();
      stopBusy = undefined;
    }
    if (
      isProcessing &&
      (!wasProcessing || state.message !== next.message || state.phase !== next.phase)
    ) {
      stopBusy = beginQuestionLoading(ui, next.message ?? defaultMessage(next.phase));
    }

    state = next;
    ui.setStatus("feature-flow-state", next.message ?? statusForPhase(next.phase));
    return state;
  };

  const runWithPhase = async <T>(
    phase: FeatureFlowPhase,
    message: string,
    work: () => Promise<T>,
  ): Promise<T> => {
    apply(phase, message);
    return work();
  };

  return {
    get current() {
      return state;
    },
    setPhase: apply,
    inputReady: (message) => apply("input-ready", message),
    busy: (message, work) => runWithPhase("busy", message, work),
    rendering: (message, work) => runWithPhase("rendering", message, work),
    complete: (message) => apply("complete", message),
    dispose: () => {
      stopBusy?.();
      stopBusy = undefined;
      ui.setStatus("feature-flow-state", undefined);
    },
  };
}

function defaultMessage(phase: FeatureFlowPhase): string {
  return phase === "rendering" ? "Rendering…" : "Thinking…";
}

function statusForPhase(phase: FeatureFlowPhase): string | undefined {
  if (phase === "input-ready") return "Waiting for input";
  if (phase === "busy") return "Processing";
  if (phase === "rendering") return "Rendering";
  return undefined;
}
