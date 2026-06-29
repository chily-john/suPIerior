import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StepMetrics } from "@/runtime/artifacts/step-metrics.types";

// Mock the config store to return metrics enabled
vi.mock("@/runtime/artifacts/step-metrics-store", () => ({
  readConfig: vi.fn().mockResolvedValue({ metricsEnabled: true }),
  appendStepMetrics: vi.fn().mockResolvedValue(undefined),
  ensureMetricsDir: vi.fn().mockResolvedValue("/test/metrics/dir"),
}));

describe("metrics hook on agent end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should write metrics to disk", async () => {
    // Import the hook functions
    const {
      completeStepMetrics,
      clearAllPendingMetrics,
      getPendingMetricsForFlower,
    } = await import("@/runtime/artifacts/step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;
    const stepId = "test-step";

    // Create a partial metrics object and add it to pending
    const partialMetrics: Partial<StepMetrics> = {
      stepIndex,
      stepId,
      startedAt: new Date("2026-01-02T03:04:05.000Z").toISOString(),
      model: { provider: "test", id: "test-model", api: null },
      thinkingLevel: "high",
      errorCount: 0,
      lastErrorMessage: null,
      toolCallCount: 0,
      toolNames: [],
    };

    // Add the partial metrics to the pending map
    const pending = getPendingMetricsForFlower(flowerPath);
    pending.set(stepIndex, partialMetrics);

    // Create a mock assistant message with usage data and tool calls
    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
      content: [
        { type: "text", text: "test response" },
        { type: "tool_call", name: "test-tool" },
      ],
    };

    // Call completeStepMetrics directly
    await completeStepMetrics(flowerPath, stepIndex, assistantMessage, workflowerRoot);

    // Check that appendStepMetrics was called
    const { appendStepMetrics } = await import("@/runtime/artifacts/step-metrics-store");

    expect(appendStepMetrics).toHaveBeenCalled();

    // Check that it was called with the correct arguments
    expect(appendStepMetrics).toHaveBeenCalledWith(
      flowerPath,
      expect.objectContaining({
        stepIndex: 0,
        stepId: "test-step",
        completedAt: expect.any(String),
        durationMs: expect.any(Number),
        inputTokens: 100,
        outputTokens: 50,
        toolCallCount: 1,
        toolNames: ["test-tool"],
      }),
    );

    // Check that the step was removed from pending metrics
    const updatedPending = getPendingMetricsForFlower(flowerPath);
    expect(updatedPending.get(stepIndex)).toBeUndefined();
  });

  it("should be a no-op when metrics are disabled", async () => {
    const { completeStepMetrics, clearAllPendingMetrics } = await import(
      "@/runtime/artifacts/step-metrics-hook"
    );

    // Clear any previous state
    clearAllPendingMetrics();

    // Override the mock to return metrics disabled
    const { readConfig } = await import("@/runtime/artifacts/step-metrics-store");
    vi.mocked(readConfig).mockResolvedValueOnce({ metricsEnabled: false });

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
      content: [{ type: "text", text: "test response" }],
    };

    // Call completeStepMetrics
    await completeStepMetrics(flowerPath, stepIndex, assistantMessage, workflowerRoot);

    // Check that appendStepMetrics was NOT called
    const { appendStepMetrics } = await import("@/runtime/artifacts/step-metrics-store");
    expect(appendStepMetrics).not.toHaveBeenCalled();
  });

  it("should be a no-op when no pending metrics exist", async () => {
    const { completeStepMetrics, clearAllPendingMetrics } = await import(
      "@/runtime/artifacts/step-metrics-hook"
    );

    // Clear any previous state
    clearAllPendingMetrics();

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
      content: [{ type: "text", text: "test response" }],
    };

    // Call completeStepMetrics without any pending metrics
    await completeStepMetrics(flowerPath, stepIndex, assistantMessage, workflowerRoot);

    // Check that appendStepMetrics was NOT called
    const { appendStepMetrics } = await import("@/runtime/artifacts/step-metrics-store");
    expect(appendStepMetrics).not.toHaveBeenCalled();
  });

  it("should handle missing usage data", async () => {
    const {
      completeStepMetrics,
      clearAllPendingMetrics,
      getPendingMetricsForFlower,
    } = await import("@/runtime/artifacts/step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;

    // Create a partial metrics object and add it to pending
    const partialMetrics: Partial<StepMetrics> = {
      stepIndex,
      stepId: "test-step",
      startedAt: new Date().toISOString(),
      model: { provider: "test", id: "test-model", api: null },
      thinkingLevel: "high",
      errorCount: 0,
      lastErrorMessage: null,
      toolCallCount: 0,
      toolNames: [],
    };

    // Add the partial metrics to the pending map
    const pending = getPendingMetricsForFlower(flowerPath);
    pending.set(stepIndex, partialMetrics);

    // Create a mock assistant message WITHOUT usage data
    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      content: [{ type: "text", text: "test response" }],
    };

    // Call completeStepMetrics
    await completeStepMetrics(flowerPath, stepIndex, assistantMessage, workflowerRoot);

    // Check that appendStepMetrics was called with null for token fields
    const { appendStepMetrics } = await import("@/runtime/artifacts/step-metrics-store");

    expect(appendStepMetrics).toHaveBeenCalledWith(
      flowerPath,
      expect.objectContaining({
        inputTokens: null,
        outputTokens: null,
      }),
    );
  });

  it("should extract tool names from tool_call and tool_result blocks", async () => {
    const {
      completeStepMetrics,
      clearAllPendingMetrics,
      getPendingMetricsForFlower,
    } = await import("@/runtime/artifacts/step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;

    // Create a partial metrics object and add it to pending
    const partialMetrics: Partial<StepMetrics> = {
      stepIndex,
      stepId: "test-step",
      startedAt: new Date().toISOString(),
      model: { provider: "test", id: "test-model", api: null },
      thinkingLevel: "high",
      errorCount: 0,
      lastErrorMessage: null,
      toolCallCount: 0,
      toolNames: [],
    };

    // Add the partial metrics to the pending map
    const pending = getPendingMetricsForFlower(flowerPath);
    pending.set(stepIndex, partialMetrics);

    // Create a mock assistant message with both tool_call and tool_result blocks
    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
      content: [
        { type: "text", text: "test response" },
        { type: "tool_call", name: "tool-one" },
        { type: "tool_result", name: "tool-two" },
        { type: "tool_call", name: "tool-three" },
      ],
    };

    // Call completeStepMetrics
    await completeStepMetrics(flowerPath, stepIndex, assistantMessage, workflowerRoot);

    // Check that appendStepMetrics was called with correct tool info
    const { appendStepMetrics } = await import("@/runtime/artifacts/step-metrics-store");

    expect(appendStepMetrics).toHaveBeenCalledWith(
      flowerPath,
      expect.objectContaining({
        toolCallCount: 3,
        toolNames: ["tool-one", "tool-two", "tool-three"],
      }),
    );
  });
});

describe("error tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should increment errorCount on retry", async () => {
    const {
      getPendingMetricsForFlower,
      clearAllPendingMetrics,
      startStepMetrics,
    } = await import("@/runtime/artifacts/step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;
    const stepId = "test-step";

    // Create a workflow and step for startStepMetrics
    const workflow = { id: "test-workflow", steps: [] };
    const step = { id: stepId };
    const state = { currentStepIndex: stepIndex };

    // Start metrics collection for the step
    await startStepMetrics(flowerPath, stepIndex, stepId, workflow, step, state, workflowerRoot);

    // Verify pending metrics were created with errorCount = 0
    const pending = getPendingMetricsForFlower(flowerPath);
    const partial = pending.get(stepIndex);
    expect(partial?.errorCount).toBe(0);

    // Simulate a step error by calling recordStepError
    const { recordStepError } = await import("@/runtime/artifacts/step-metrics-hook");
    const error = new Error("Test error");
    await recordStepError(flowerPath, stepIndex, error, workflowerRoot);

    // Check that errorCount was incremented
    const updatedPartial = pending.get(stepIndex);
    expect(updatedPartial?.errorCount).toBe(1);
    expect(updatedPartial?.lastErrorMessage).toBe("Test error");
  });

  it("should preserve only the last error message on multiple errors", async () => {
    const {
      getPendingMetricsForFlower,
      clearAllPendingMetrics,
      startStepMetrics,
      recordStepError,
    } = await import("@/runtime/artifacts/step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;
    const stepId = "test-step";

    // Create a workflow and step for startStepMetrics
    const workflow = { id: "test-workflow", steps: [] };
    const step = { id: stepId };
    const state = { currentStepIndex: stepIndex };

    // Start metrics collection for the step
    await startStepMetrics(flowerPath, stepIndex, stepId, workflow, step, state, workflowerRoot);

    // Simulate multiple errors
    await recordStepError(flowerPath, stepIndex, new Error("First error"), workflowerRoot);
    await recordStepError(flowerPath, stepIndex, new Error("Second error"), workflowerRoot);
    await recordStepError(flowerPath, stepIndex, new Error("Third error"), workflowerRoot);

    // Check that errorCount was incremented to 3
    const pending = getPendingMetricsForFlower(flowerPath);
    const updatedPartial = pending.get(stepIndex);
    expect(updatedPartial?.errorCount).toBe(3);
    // Should only preserve the last error message
    expect(updatedPartial?.lastErrorMessage).toBe("Third error");
  });

  it("should be a no-op when metrics are disabled", async () => {
    const {
      getPendingMetricsForFlower,
      clearAllPendingMetrics,
      startStepMetrics,
      recordStepError,
    } = await import("@/runtime/artifacts/step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    // Override the mock to return metrics disabled
    const { readConfig } = await import("@/runtime/artifacts/step-metrics-store");
    vi.mocked(readConfig).mockResolvedValueOnce({ metricsEnabled: false });

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;
    const stepId = "test-step";

    // Create a workflow and step for startStepMetrics
    const workflow = { id: "test-workflow", steps: [] };
    const step = { id: stepId };
    const state = { currentStepIndex: stepIndex };

    // Start metrics collection for the step (will be no-op due to disabled metrics)
    await startStepMetrics(flowerPath, stepIndex, stepId, workflow, step, state, workflowerRoot);

    // Try to record an error (should be no-op)
    await recordStepError(flowerPath, stepIndex, new Error("Test error"), workflowerRoot);

    // Check that no pending metrics were created
    const pending = getPendingMetricsForFlower(flowerPath);
    const updatedPartial = pending.get(stepIndex);
    expect(updatedPartial).toBeUndefined();
  });

  it("should be a no-op when no pending metrics exist", async () => {
    const {
      getPendingMetricsForFlower,
      clearAllPendingMetrics,
      recordStepError,
    } = await import("@/runtime/artifacts/step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "/test";
    const stepIndex = 0;

    // Try to record an error without any pending metrics
    await recordStepError(flowerPath, stepIndex, new Error("Test error"), workflowerRoot);

    // Check that no pending metrics were created
    const pending = getPendingMetricsForFlower(flowerPath);
    const updatedPartial = pending.get(stepIndex);
    expect(updatedPartial).toBeUndefined();
  });
});
