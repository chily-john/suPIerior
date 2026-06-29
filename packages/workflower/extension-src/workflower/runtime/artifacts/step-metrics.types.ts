export interface ModelInfo {
  provider: string | null;
  id: string | null;
  api: string | null;
}

export interface StepMetrics {
  stepIndex: number;
  stepId: string;
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  model: ModelInfo;
  thinkingLevel: string | null;
  errorCount: number;
  lastErrorMessage: string | null;
  toolCallCount: number;
  toolNames: string[];
}

export interface FlowerMetrics {
  workflowId: string;
  gardenName: string;
  flowerPath: string;
  steps: StepMetrics[];
}

export interface WorkflowerConfig {
  metricsEnabled: boolean;
}
