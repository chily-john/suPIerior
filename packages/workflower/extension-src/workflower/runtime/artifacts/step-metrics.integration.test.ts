import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { resolve } from "path";
import type { StepMetrics, WorkflowerConfig } from "./step-metrics.types";

// Mock the config store
vi.mock("./step-metrics-store", async () => {
  const actual = await vi.importActual("./step-metrics-store");
  return {
    ...actual,
    readConfig: vi.fn().mockResolvedValue({ metricsEnabled: true }),
  };
});

// Helper to create a test workflow directory structure
async function setupTestWorkflow(workflowerRoot: string, gardenName: string, flowerName: string): Promise<string> {
  const flowerPath = resolve(workflowerRoot, "workflows", gardenName, flowerName, "index.json");
  const workflowsDir = resolve(workflowerRoot, "workflows", gardenName, flowerName);
  
  await fs.mkdir(workflowsDir, { recursive: true });
  
  // Create a minimal workflow definition
  const workflowDef = {
    id: "test-workflow",
    name: "Test Workflow",
    steps: [
      { id: "step-0", workflowId: "test-workflow" },
      { id: "step-1", workflowId: "test-workflow" },
    ],
  };
  
  await fs.writeFile(flowerPath, JSON.stringify(workflowDef, null, 2));
  
  return flowerPath;
}

// Helper to cleanup test directories
async function cleanupTestWorkflow(workflowerRoot: string): Promise<void> {
  try {
    await fs.rm(workflowerRoot, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// Helper to read metrics file
async function readMetricsFile(flowerPath: string): Promise<StepMetrics[] | null> {
  const normalizedPath = flowerPath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/");
  const workflowsIndex = parts.indexOf("workflows");
  
  if (workflowsIndex === -1) {
    return null;
  }
  
  const garden = parts[workflowsIndex + 1];
  const flower = parts[workflowsIndex + 2];
  const basePath = parts.slice(0, workflowsIndex).join("/");
  const metricsFile = resolve(basePath, ".workflower", "past-runs-data", garden, flower, "metrics.json");
  
  try {
    const content = await fs.readFile(metricsFile, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

describe("end-to-end metrics", () => {
  const testWorkflowerRoot = "/tmp/test-workflower-integration";
  const gardenName = "test-garden";
  const flowerName = "test-flower";
  let flowerPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestWorkflow(testWorkflowerRoot);
    flowerPath = await setupTestWorkflow(testWorkflowerRoot, gardenName, flowerName);
  });

  afterEach(async () => {
    await cleanupTestWorkflow(testWorkflowerRoot);
    // Reset the config cache
    const { resetConfigCache } = await import("./step-metrics-store");
    resetConfigCache();
  });

  it("should capture metrics for a complete workflow", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      clearAllPendingMetrics,
    } = await import("./step-metrics-hook");

    // Clear any previous state
    clearAllPendingMetrics();

    // Create workflow and step definitions
    const workflow = { id: "test-workflow", model: "test-provider/test-model" as const, steps: [] };
    const step0 = { id: "step-0", command: "test command 0" };
    const step1 = { id: "step-1", command: "test command 1" };
    const state = { 
      sessionId: "test-session",
      id: "test-workflow",
      name: "Test Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    // Start metrics for step 0
    await startStepMetrics(flowerPath, 0, "step-0", workflow, step0, state, testWorkflowerRoot);

    // Simulate step 0 completion with assistant message
    const assistantMessageStep0 = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
      content: [
        { type: "text", text: "Step 0 response" },
      ],
    };

    await completeStepMetrics(flowerPath, 0, assistantMessageStep0, testWorkflowerRoot);

    // Start metrics for step 1
    await startStepMetrics(flowerPath, 1, "step-1", workflow, step1, state, testWorkflowerRoot);

    // Simulate step 1 completion with tool calls
    const assistantMessageStep1 = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 150,
        outputTokens: 75,
      },
      content: [
        { type: "text", text: "Step 1 response" },
        { type: "tool_call", name: "test-tool" },
        { type: "tool_result", name: "test-tool" },
      ],
    };

    await completeStepMetrics(flowerPath, 1, assistantMessageStep1, testWorkflowerRoot);

    // Read the metrics file
    const metrics = await readMetricsFile(flowerPath);

    // Verify metrics.json exists and contains valid data
    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(2);

    // Verify step 0 metrics
    const step0Metrics = metrics![0];
    expect(step0Metrics.stepIndex).toBe(0);
    expect(step0Metrics.stepId).toBe("step-0");
    expect(step0Metrics.startedAt).toBeDefined();
    expect(step0Metrics.completedAt).toBeDefined();
    expect(step0Metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(step0Metrics.inputTokens).toBe(100);
    expect(step0Metrics.outputTokens).toBe(50);
    expect(step0Metrics.model.provider).toBe("test-provider");
    expect(step0Metrics.model.id).toBe("test-model");
    expect(step0Metrics.thinkingLevel).toBeNull();
    expect(step0Metrics.errorCount).toBe(0);
    expect(step0Metrics.lastErrorMessage).toBeNull();
    expect(step0Metrics.toolCallCount).toBe(0);
    expect(step0Metrics.toolNames).toEqual([]);

    // Verify step 1 metrics
    const step1Metrics = metrics![1];
    expect(step1Metrics.stepIndex).toBe(1);
    expect(step1Metrics.stepId).toBe("step-1");
    expect(step1Metrics.startedAt).toBeDefined();
    expect(step1Metrics.completedAt).toBeDefined();
    expect(step1Metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(step1Metrics.inputTokens).toBe(150);
    expect(step1Metrics.outputTokens).toBe(75);
    expect(step1Metrics.toolCallCount).toBe(2);
    expect(step1Metrics.toolNames).toContain("test-tool");
  });

  it("should capture metrics for a simple 1-step workflow", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      clearAllPendingMetrics,
    } = await import("./step-metrics-hook");

    clearAllPendingMetrics();

    const workflow = { id: "simple-workflow", steps: [] };
    const step = { id: "single-step", command: "test command" };
    const state = { 
      sessionId: "test-session",
      id: "simple-workflow",
      name: "Simple Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    await startStepMetrics(flowerPath, 0, "single-step", workflow, step, state, testWorkflowerRoot);

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 50,
        outputTokens: 25,
      },
      content: [{ type: "text", text: "Simple response" }],
    };

    await completeStepMetrics(flowerPath, 0, assistantMessage, testWorkflowerRoot);

    const metrics = await readMetricsFile(flowerPath);

    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(1);
    expect(metrics![0].stepId).toBe("single-step");
    expect(metrics![0].inputTokens).toBe(50);
    expect(metrics![0].outputTokens).toBe(25);
  });

  it("should capture metrics for multi-step workflow", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      clearAllPendingMetrics,
    } = await import("./step-metrics-hook");

    clearAllPendingMetrics();

    const workflow = { id: "multi-step-workflow", steps: [] };
    const steps = [
      { id: "step-0", command: "test command 0" },
      { id: "step-1", command: "test command 1" },
      { id: "step-2", command: "test command 2" },
      { id: "step-3", command: "test command 3" },
    ];
    const state = { 
      sessionId: "test-session",
      id: "multi-step-workflow",
      name: "Multi-step Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    // Execute all 4 steps
    for (let i = 0; i < 4; i++) {
      await startStepMetrics(flowerPath, i, steps[i].id, workflow, steps[i], state, testWorkflowerRoot);
      
      const assistantMessage = {
        role: "assistant",
        stopReason: "end_turn",
        usage: {
          inputTokens: 100 + i * 10,
          outputTokens: 50 + i * 5,
        },
        content: [{ type: "text", text: `Step ${i} response` }],
      };

      await completeStepMetrics(flowerPath, i, assistantMessage, testWorkflowerRoot);
    }

    const metrics = await readMetricsFile(flowerPath);

    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(4);
    
    // Verify each step has correct index
    for (let i = 0; i < 4; i++) {
      expect(metrics![i].stepIndex).toBe(i);
      expect(metrics![i].stepId).toBe(`step-${i}`);
      expect(metrics![i].inputTokens).toBe(100 + i * 10);
      expect(metrics![i].outputTokens).toBe(50 + i * 5);
    }
  });

  it("should capture metrics with errors and retries", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      recordStepError,
      clearAllPendingMetrics,
    } = await import("./step-metrics-hook");

    clearAllPendingMetrics();

    const workflow = { id: "error-workflow", steps: [] };
    const step = { id: "error-step", command: "test command" };
    const state = { 
      sessionId: "test-session",
      id: "error-workflow",
      name: "Error Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    await startStepMetrics(flowerPath, 0, "error-step", workflow, step, state, testWorkflowerRoot);

    // Simulate multiple errors
    await recordStepError(flowerPath, 0, new Error("First error"), testWorkflowerRoot);
    await recordStepError(flowerPath, 0, new Error("Second error"), testWorkflowerRoot);
    await recordStepError(flowerPath, 0, new Error("Third error"), testWorkflowerRoot);

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 200,
        outputTokens: 100,
      },
      content: [{ type: "text", text: "Response after errors" }],
    };

    await completeStepMetrics(flowerPath, 0, assistantMessage, testWorkflowerRoot);

    const metrics = await readMetricsFile(flowerPath);

    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(1);
    
    const stepMetrics = metrics![0];
    expect(stepMetrics.errorCount).toBe(3);
    expect(stepMetrics.lastErrorMessage).toBe("Third error");
  });

  it("should capture metrics with tool calls", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      clearAllPendingMetrics,
    } = await import("./step-metrics-hook");

    clearAllPendingMetrics();

    const workflow = { id: "tool-workflow", steps: [] };
    const step = { id: "tool-step", command: "test command" };
    const state = { 
      sessionId: "test-session",
      id: "tool-workflow",
      name: "Tool Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    await startStepMetrics(flowerPath, 0, "tool-step", workflow, step, state, testWorkflowerRoot);

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 300,
        outputTokens: 200,
      },
      content: [
        { type: "text", text: "Before tool call" },
        { type: "tool_call", name: "read" },
        { type: "tool_result", name: "read" },
        { type: "text", text: "After tool call" },
        { type: "tool_call", name: "write" },
        { type: "tool_result", name: "write" },
        { type: "tool_call", name: "bash" },
        { type: "tool_result", name: "bash" },
      ],
    };

    await completeStepMetrics(flowerPath, 0, assistantMessage, testWorkflowerRoot);

    const metrics = await readMetricsFile(flowerPath);

    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(1);
    
    const stepMetrics = metrics![0];
    expect(stepMetrics.toolCallCount).toBe(6); // 3 tool_call + 3 tool_result
    expect(stepMetrics.toolNames).toEqual(["read", "read", "write", "write", "bash", "bash"]);
  });

  it("should not create metrics when config enable is false", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      clearAllPendingMetrics,
    } = await import("./step-metrics-hook");

    clearAllPendingMetrics();

    // Override mock to return metrics disabled
    const { readConfig } = await import("./step-metrics-store");
    vi.mocked(readConfig).mockResolvedValueOnce({ metricsEnabled: false });

    const workflow = { id: "disabled-workflow", steps: [] };
    const step = { id: "disabled-step", command: "test command" };
    const state = { 
      sessionId: "test-session",
      id: "disabled-workflow",
      name: "Disabled Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    await startStepMetrics(flowerPath, 0, "disabled-step", workflow, step, state, testWorkflowerRoot);

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
      content: [{ type: "text", text: "Response" }],
    };

    await completeStepMetrics(flowerPath, 0, assistantMessage, testWorkflowerRoot);

    const metrics = await readMetricsFile(flowerPath);

    // Metrics should be null (file doesn't exist) when disabled
    expect(metrics).toBeNull();
  });

  it("should persist metrics after workflow completion", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      clearAllPendingMetrics,
    } = await import("./step-metrics-hook");

    clearAllPendingMetrics();

    const workflow = { id: "persist-workflow", steps: [] };
    const step = { id: "persist-step", command: "test command" };
    const state = { 
      sessionId: "test-session",
      id: "persist-workflow",
      name: "Persist Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    await startStepMetrics(flowerPath, 0, "persist-step", workflow, step, state, testWorkflowerRoot);

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 400,
        outputTokens: 300,
      },
      content: [{ type: "text", text: "Persist response" }],
    };

    await completeStepMetrics(flowerPath, 0, assistantMessage, testWorkflowerRoot);

    // Read metrics immediately after completion
    let metrics = await readMetricsFile(flowerPath);
    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(1);

    // Read again to verify persistence
    metrics = await readMetricsFile(flowerPath);
    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(1);
    expect(metrics![0].stepId).toBe("persist-step");
  });

  it("should verify timing calculations are correct", async () => {
    const {
      startStepMetrics,
      completeStepMetrics,
      clearAllPendingMetrics,
      getPendingMetricsForFlower,
    } = await import("./step-metrics-hook");

    clearAllPendingMetrics();

    const workflow = { id: "timing-workflow", steps: [] };
    const step = { id: "timing-step", command: "test command" };
    const state = { 
      sessionId: "test-session",
      id: "timing-workflow",
      name: "Timing Workflow",
      workdir: testWorkflowerRoot,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runtimeDefaults: {},
    };

    await startStepMetrics(flowerPath, 0, "timing-step", workflow, step, state, testWorkflowerRoot);

    // Get the pending metrics and modify startedAt to a known time
    const pending = getPendingMetricsForFlower(flowerPath);
    const partial = pending.get(0);
    const startedAt = new Date("2024-01-01T00:00:00.000Z");
    
    if (partial) {
      pending.set(0, { ...partial, startedAt: startedAt.toISOString() });
    }

    // Wait a small amount to ensure duration > 0
    await new Promise(resolve => setTimeout(resolve, 10));

    const assistantMessage = {
      role: "assistant",
      stopReason: "end_turn",
      usage: {
        inputTokens: 50,
        outputTokens: 25,
      },
      content: [{ type: "text", text: "Timing response" }],
    };

    await completeStepMetrics(flowerPath, 0, assistantMessage, testWorkflowerRoot);

    const metrics = await readMetricsFile(flowerPath);

    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics).toHaveLength(1);
    
    const stepMetrics = metrics![0];
    expect(stepMetrics.startedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(stepMetrics.completedAt).toBeDefined();
    expect(stepMetrics.durationMs).toBeGreaterThanOrEqual(10); // At least 10ms
  });
});
