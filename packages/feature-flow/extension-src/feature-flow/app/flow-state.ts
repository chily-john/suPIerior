import type { FeatureFlowUi } from "@app/ui";
import {
  createInitialFeatureFlowState,
  isFeatureFlowProcessing,
  transitionFeatureFlowState,
  type FeatureFlowPhase,
  type FeatureFlowState,
} from "@domain/discovery/state";

interface FeatureFlowLoadingOptions {
  message?: string;
}

export interface FeatureFlowStateController {
  readonly current: FeatureFlowState;
  setPhase(phase: FeatureFlowPhase, message?: string): FeatureFlowState;
  inputReady(message?: string): FeatureFlowState;
  busy<T>(message: string | FeatureFlowLoadingOptions, work: () => Promise<T>): Promise<T>;
  rendering<T>(message: string | FeatureFlowLoadingOptions, work: () => Promise<T>): Promise<T>;
  complete(message?: string): FeatureFlowState;
  dispose(): void;
}

export function createFeatureFlowStateController(ui: FeatureFlowUi): FeatureFlowStateController {
  let state = createInitialFeatureFlowState();
  let stopBusy: (() => void) | undefined;

  const apply = (
    phase: FeatureFlowPhase,
    messageOrOptions?: string | FeatureFlowLoadingOptions,
  ): FeatureFlowState => {
    const loadingOptions = normalizeLoadingOptions(messageOrOptions);
    const next = transitionFeatureFlowState(state, phase, loadingOptions?.message);
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
      stopBusy = beginFeatureFlowLoading(
        ui,
        loadingOptions ?? { message: defaultMessage(next.phase) },
      );
    }

    state = next;
    ui.setStatus("feature-flow-state", next.message ?? statusForPhase(next.phase));
    return state;
  };

  const runWithPhase = async <T>(
    phase: FeatureFlowPhase,
    messageOrOptions: string | FeatureFlowLoadingOptions,
    work: () => Promise<T>,
  ): Promise<T> => {
    apply(phase, messageOrOptions);
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

function normalizeLoadingOptions(
  messageOrOptions: string | FeatureFlowLoadingOptions | undefined,
): FeatureFlowLoadingOptions | undefined {
  if (typeof messageOrOptions === "string") return { message: messageOrOptions };
  return messageOrOptions;
}

function beginFeatureFlowLoading(
  ui: FeatureFlowUi,
  options: FeatureFlowLoadingOptions,
): () => void {
  ui.setEditorText?.("");
  ui.setWorkingIndicator?.();
  ui.setWorkingMessage?.(options.message ?? "Thinking…");
  ui.setWorkingVisible?.(true);
  const unsubscribe = ui.onTerminalInput?.(() => ({ consume: true }));
  return () => {
    unsubscribe?.();
    ui.setWorkingVisible?.(false);
    ui.setWorkingMessage?.();
    ui.setWorkingIndicator?.();
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
