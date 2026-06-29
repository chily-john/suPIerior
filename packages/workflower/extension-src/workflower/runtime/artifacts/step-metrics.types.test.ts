import { expect, describe, it } from "vitest";
import type { StepMetrics, FlowerMetrics, WorkflowerConfig, ModelInfo } from "./step-metrics.types";

describe("StepMetrics types", () => {
  it("should have all required fields", () => {
    const stepMetrics: StepMetrics = {
      stepIndex: 0,
      stepId: "test-step",
      startedAt: "2024-01-01T00:00:00Z",
      completedAt: "2024-01-01T00:00:01Z",
      durationMs: 1000,
      inputTokens: 100,
      outputTokens: 200,
      model: {
        provider: "test-provider",
        id: "test-model",
        api: "test-api",
      },
      thinkingLevel: "high",
      errorCount: 0,
      lastErrorMessage: null,
      toolCallCount: 5,
      toolNames: ["tool1", "tool2"],
    };

    expect(stepMetrics.stepIndex).toBe(0);
    expect(stepMetrics.stepId).toBe("test-step");
    expect(stepMetrics.startedAt).toBe("2024-01-01T00:00:00Z");
    expect(stepMetrics.completedAt).toBe("2024-01-01T00:00:01Z");
    expect(stepMetrics.durationMs).toBe(1000);
    expect(stepMetrics.inputTokens).toBe(100);
    expect(stepMetrics.outputTokens).toBe(200);
    expect(stepMetrics.model.provider).toBe("test-provider");
    expect(stepMetrics.model.id).toBe("test-model");
    expect(stepMetrics.model.api).toBe("test-api");
    expect(stepMetrics.thinkingLevel).toBe("high");
    expect(stepMetrics.errorCount).toBe(0);
    expect(stepMetrics.lastErrorMessage).toBeNull();
    expect(stepMetrics.toolCallCount).toBe(5);
    expect(stepMetrics.toolNames).toEqual(["tool1", "tool2"]);
  });

  it("should allow null for optional numeric fields", () => {
    const stepMetrics: StepMetrics = {
      stepIndex: 0,
      stepId: "test-step",
      startedAt: "2024-01-01T00:00:00Z",
      completedAt: "2024-01-01T00:00:01Z",
      durationMs: 1000,
      inputTokens: null,
      outputTokens: null,
      model: {
        provider: null,
        id: null,
        api: null,
      },
      thinkingLevel: null,
      errorCount: 0,
      lastErrorMessage: null,
      toolCallCount: 0,
      toolNames: [],
    };

    expect(stepMetrics.inputTokens).toBeNull();
    expect(stepMetrics.outputTokens).toBeNull();
    expect(stepMetrics.model.provider).toBeNull();
    expect(stepMetrics.model.id).toBeNull();
    expect(stepMetrics.model.api).toBeNull();
    expect(stepMetrics.thinkingLevel).toBeNull();
    expect(stepMetrics.toolNames).toEqual([]);
  });
});

describe("FlowerMetrics types", () => {
  it("should have all required fields", () => {
    const flowerMetrics: FlowerMetrics = {
      workflowId: "test-workflow",
      gardenName: "test-garden",
      flowerPath: "/test/path",
      steps: [],
    };

    expect(flowerMetrics.workflowId).toBe("test-workflow");
    expect(flowerMetrics.gardenName).toBe("test-garden");
    expect(flowerMetrics.flowerPath).toBe("/test/path");
    expect(flowerMetrics.steps).toEqual([]);
  });
});

describe("WorkflowerConfig types", () => {
  it("should have all required fields", () => {
    const config: WorkflowerConfig = {
      metricsEnabled: true,
    };

    expect(config.metricsEnabled).toBe(true);
  });
});

describe("ModelInfo types", () => {
  it("should have all required fields", () => {
    const modelInfo: ModelInfo = {
      provider: "test-provider",
      id: "test-model",
      api: "test-api",
    };

    expect(modelInfo.provider).toBe("test-provider");
    expect(modelInfo.id).toBe("test-model");
    expect(modelInfo.api).toBe("test-api");
  });

  it("should allow null values", () => {
    const modelInfo: ModelInfo = {
      provider: null,
      id: null,
      api: null,
    };

    expect(modelInfo.provider).toBeNull();
    expect(modelInfo.id).toBeNull();
    expect(modelInfo.api).toBeNull();
  });
});
