import { readConfig } from './step-metrics-store';
import type { StepMetrics, ModelInfo } from './step-metrics.types';
import type { ActiveWorkflowState } from '@orchestration/runtime/active-state/active-state.types';
import type { WorkflowStep, WorkflowDefinition } from '@package-api/workflow-definition.types';

// Map of flowerPath -> stepIndex -> partial StepMetrics
const pendingMetrics = new Map<string, Map<number, Partial<StepMetrics>>>();

/**
 * Gets the pending metrics map for a specific flower.
 * Creates it if it doesn't exist.
 */
function ensurePendingMetricsForFlower(flowerPath: string): Map<number, Partial<StepMetrics>> {
  if (!pendingMetrics.has(flowerPath)) {
    pendingMetrics.set(flowerPath, new Map());
  }
  return pendingMetrics.get(flowerPath)!;
}

/**
 * Extracts model info from workflow state and step configuration.
 * Priority: step.model > workflow.model > state.runtimeDefaults.model
 */
function extractModelInfo(
  workflow: WorkflowDefinition,
  step: WorkflowStep,
  state: ActiveWorkflowState
): ModelInfo {
  // Try step model first
  if (step.model) {
    const modelRef = typeof step.model === 'string' ? step.model : step.model[0];
    return parseModelReference(modelRef);
  }

  // Try workflow model
  if (workflow.model) {
    const modelRef = typeof workflow.model === 'string' ? workflow.model : workflow.model[0];
    return parseModelReference(modelRef);
  }

  // Try runtime defaults
  if (state.runtimeDefaults?.model) {
    return parseModelReference(state.runtimeDefaults.model);
  }

  return {
    provider: null,
    id: null,
    api: null,
  };
}

/**
 * Parses a model reference string into ModelInfo.
 * Format: provider/model-id or provider/api/model-id
 */
function parseModelReference(modelRef: string): ModelInfo {
  const parts = modelRef.split('/');
  if (parts.length >= 2) {
    return {
      provider: parts[0] as string | null,
      id: parts.slice(1).join('/') as string | null,
      api: null,
    };
  }
  return {
    provider: null,
    id: null,
    api: null,
  };
}

/**
 * Extracts thinking level from step, workflow, or state.
 * Priority: step.thinkingLevel > workflow.thinkingLevel > state.runtimeDefaults.thinkingLevel
 */
function extractThinkingLevel(
  workflow: WorkflowDefinition,
  step: WorkflowStep,
  state: ActiveWorkflowState
): string | null {
  return step.thinkingLevel
    ?? workflow.thinkingLevel
    ?? state.runtimeDefaults?.thinkingLevel
    ?? null;
}

/**
 * Starts metrics collection for a step.
 * Creates a partial StepMetrics object and stores it in the pending metrics map.
 * This is a no-op if metrics are disabled.
 *
 * @param flowerPath - Absolute path to the flower's index.json file
 * @param stepIndex - Index of the step in the workflow
 * @param stepId - ID of the step
 * @param workflow - The workflow definition
 * @param step - The step definition
 * @param state - The active workflow state
 * @param workflowerRoot - The root directory of the Workflower workflow
 */
export async function startStepMetrics(
  flowerPath: string,
  stepIndex: number,
  stepId: string,
  workflow: WorkflowDefinition,
  step: WorkflowStep,
  state: ActiveWorkflowState,
  workflowerRoot: string
): Promise<void> {
  const config = await readConfig(workflowerRoot);
  if (!config.metricsEnabled) {
    return;
  }

  const modelInfo = extractModelInfo(workflow, step, state);
  const thinkingLevel = extractThinkingLevel(workflow, step, state);

  const partial: Partial<StepMetrics> = {
    stepIndex,
    stepId,
    startedAt: new Date().toISOString(),
    model: modelInfo,
    thinkingLevel,
    errorCount: 0,
    lastErrorMessage: null,
    toolCallCount: 0,
    toolNames: [],
  };

  ensurePendingMetricsForFlower(flowerPath).set(stepIndex, partial);
}

/**
 * Gets the pending metrics for a specific flower and step.
 * Returns undefined if no metrics exist for the given flower and step.
 */
export function getPendingMetrics(
  flowerPath: string,
  stepIndex: number
): Partial<StepMetrics> | undefined {
  const flowerMetrics = pendingMetrics.get(flowerPath);
  if (!flowerMetrics) {
    return undefined;
  }
  return flowerMetrics.get(stepIndex);
}

/**
 * Gets the pending metrics map for a specific flower.
 * Used for testing.
 */
export function getPendingMetricsForFlower(flowerPath: string): Map<number, Partial<StepMetrics>> {
  return ensurePendingMetricsForFlower(flowerPath);
}

/**
 * Clears pending metrics for a specific flower.
 * Used for cleanup and testing.
 */
export function clearPendingMetricsForFlower(flowerPath: string): void {
  pendingMetrics.delete(flowerPath);
}

/**
 * Clears all pending metrics.
 * Used for testing.
 */
export function clearAllPendingMetrics(): void {
  pendingMetrics.clear();
}
