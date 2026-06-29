import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import type { WorkflowStep, WorkflowDefinition } from "@package-api/workflow-definition.types";

// Mock the config store to return metrics enabled
vi.mock("@/runtime/artifacts/step-metrics-store", () => ({
  readConfig: vi.fn().mockResolvedValue({ metricsEnabled: true }),
}));

// Mock the workflow status update
vi.mock("@/internals/workflow-orchestration/runtime/use-cases/start-step/workflow-status", () => ({
  updateWorkflowStatus: vi.fn(),
}));

// Mock the step kickoff prompt rendering
vi.mock("@orchestration/prompting/step-kickoff/render-step-kickoff-prompt", () => ({
  renderStepKickoffPrompt: vi.fn().mockReturnValue("mock prompt"),
}));

// Mock the prompt display creation
vi.mock("@orchestration/prompting/workflow-prompt-display", () => ({
  createStepPromptDisplay: vi.fn().mockReturnValue({}),
  createWorkflowPromptDisplay: vi.fn().mockReturnValue({}),
}));

// Mock the step command resolution
vi.mock("@orchestration/runtime/use-cases/start-step/resolve-workflow-step-command", () => ({
  resolveWorkflowerStepCommand: vi.fn().mockResolvedValue({ command: "test" }),
}));

describe("metrics hook on step start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should record startedAt timestamp", async () => {
    // Import the hook to clear any previous state
    const { clearAllPendingMetrics } = await import("@/runtime/artifacts/step-metrics-hook");
    clearAllPendingMetrics();

    // Import startWorkflowStep
    const { startWorkflowStep } = await import(
      "@orchestration/runtime/use-cases/start-step/start-workflow-step"
    );

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "C:/test";
    const stepIndex = 0;
    const stepId = "test-step";

    const workflow: WorkflowDefinition = {
      id: "test-workflow",
      steps: [{ id: stepId, command: "test" }],
    };

    const step: WorkflowStep = workflow.steps[0];

    const state: ActiveWorkflowState = {
      id: "test-workflow",
      name: "test-workflow",
      workdir: workflowerRoot,
      activeFlowerPath: flowerPath,
      currentStepIndex: stepIndex,
      sessionId: "test-session",
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };

    const mockPromptSender = {
      applyStepRuntimeSettings: vi.fn().mockResolvedValue(true),
      sendUserMessage: vi.fn().mockResolvedValue(undefined),
    };

    // Call startWorkflowStep
    await startWorkflowStep(workflow, state, stepIndex, mockPromptSender, {
      cwd: workflowerRoot,
    });

    // Import the hook to check if metrics were recorded
    const { getPendingMetrics } = await import("@/runtime/artifacts/step-metrics-hook");
    
    // This should now pass: startedAt should be defined
    const metrics = getPendingMetrics(flowerPath, stepIndex);
    expect(metrics?.startedAt).toBeDefined();
    expect(metrics?.stepIndex).toBe(stepIndex);
    expect(metrics?.stepId).toBe(stepId);
  });

  it("should be a no-op when metrics are disabled", async () => {
    // Import the hook to clear any previous state
    const { clearAllPendingMetrics } = await import("@/runtime/artifacts/step-metrics-hook");
    clearAllPendingMetrics();

    // Override the mock to return metrics disabled
    const { readConfig } = await import("@/runtime/artifacts/step-metrics-store");
    vi.mocked(readConfig).mockResolvedValueOnce({ metricsEnabled: false });

    // Import startWorkflowStep
    const { startWorkflowStep } = await import(
      "@orchestration/runtime/use-cases/start-step/start-workflow-step"
    );

    const flowerPath = "C:/test/workflows/test-garden/test-flower/index.json";
    const workflowerRoot = "C:/test";
    const stepIndex = 0;
    const stepId = "test-step";

    const workflow: WorkflowDefinition = {
      id: "test-workflow",
      steps: [{ id: stepId, command: "test" }],
    };

    const step: WorkflowStep = workflow.steps[0];

    const state: ActiveWorkflowState = {
      id: "test-workflow",
      name: "test-workflow",
      workdir: workflowerRoot,
      activeFlowerPath: flowerPath,
      currentStepIndex: stepIndex,
      sessionId: "test-session",
      startedAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    };

    const mockPromptSender = {
      applyStepRuntimeSettings: vi.fn().mockResolvedValue(true),
      sendUserMessage: vi.fn().mockResolvedValue(undefined),
    };

    // Call startWorkflowStep
    await startWorkflowStep(workflow, state, stepIndex, mockPromptSender, {
      cwd: workflowerRoot,
    });

    // Import the hook to check if metrics were NOT recorded
    const { getPendingMetrics } = await import("@/runtime/artifacts/step-metrics-hook");
    
    // Metrics should be undefined when disabled
    const metrics = getPendingMetrics(flowerPath, stepIndex);
    expect(metrics).toBeUndefined();
  });
});
