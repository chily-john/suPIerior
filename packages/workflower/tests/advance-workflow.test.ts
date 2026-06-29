import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkflowNotificationUi } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/workflow-runtime.types";
import type {
  WorkflowDefinition,
  WorkflowStep,
} from "../extension-src/workflower/package-api/workflow-definition.types";

// Mock the active state store to avoid file system dependencies
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store",
  () => ({
    readActiveWorkflowState: vi.fn(),
    writeActiveWorkflowState: vi.fn(),
  }),
);

// Mock the global registry
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/definitions/registry/global-registry",
  () => ({
    findWorkflow: vi.fn(),
  }),
);

// Mock other dependencies
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/flower-index-store",
  () => ({
    updateFlowerPollen: vi.fn().mockResolvedValue(undefined),
  }),
);

vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/resume/resume-state-store",
  () => ({
    persistResumeMetadataForActiveState: vi.fn().mockResolvedValue(undefined),
  }),
);

vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-paths",
  () => ({
    resolveActiveStatePath: vi.fn(() => "mock-path"),
  }),
);

vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/start-workflow-step",
  () => ({
    startWorkflowStep: vi.fn().mockResolvedValue(true),
  }),
);

vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/handoff-workflow-session",
  () => ({
    handoffWorkflowInSession: vi.fn(),
  }),
);

// Mock flower index store
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/flower-index-store",
  () => ({
    updateFlowerPollen: vi.fn().mockResolvedValue(undefined),
    markFlowerCompleted: vi.fn().mockResolvedValue(undefined),
    readFlowerIndex: vi.fn().mockResolvedValue(null),
  }),
);

// Mock remove artifacts
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/artifacts/remove-artifacts",
  () => ({
    removeEmptyWorkflowGarden: vi.fn().mockResolvedValue(undefined),
    removeGardenResumeFile: vi.fn().mockResolvedValue(undefined),
    removeGardenStateFile: vi.fn().mockResolvedValue(undefined),
    removeWorkflowWorkdir: vi.fn().mockResolvedValue(undefined),
  }),
);

describe("advance-workflow module", () => {
  it("should export advanceWorkflow function", async () => {
    const { advanceWorkflow } =
      await import("../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/advance-workflow");
    expect(typeof advanceWorkflow).toBe("function");
  });

  it("should export advanceWorkflowFromAutoNext function", async () => {
    const { advanceWorkflowFromAutoNext } =
      await import("../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/advance-workflow");
    expect(typeof advanceWorkflowFromAutoNext).toBe("function");
  });

  describe("footer status updates", () => {
    let mockUi: WorkflowNotificationUi & { setStatus: vi.Mock };
    let mockWorkflow: WorkflowDefinition;

    beforeEach(() => {
      vi.clearAllMocks();

      mockUi = {
        notify: vi.fn(),
        setStatus: vi.fn(),
      };

      mockWorkflow = {
        id: "feature-dev",
        steps: [
          { id: "implement", command: "implement" },
          { id: "test", command: "test" },
          { id: "review", command: "review" },
        ],
      };
    });

    it("should clear footer status when workflow completes all steps", async () => {
      const { advanceWorkflow } =
        await import("../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/advance-workflow");

      const { findWorkflow } =
        await import("../extension-src/workflower/internals/workflow-orchestration/definitions/registry/global-registry");
      const { readActiveWorkflowState } =
        await import("../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store");

      // Mock the workflow registry to return our test workflow
      vi.mocked(findWorkflow).mockReturnValue(mockWorkflow);

      // Mock the active state to be at the last step (step 2)
      vi.mocked(readActiveWorkflowState).mockResolvedValue({
        id: "feature-dev",
        currentStepIndex: 2, // Last step index
        gardenName: "test-garden",
        name: "feature-dev",
        workdir: "C:\\test",
        sessionId: "test-session",
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      const ctx = {
        cwd: "C:\\test",
        ui: mockUi,
        sessionManager: {
          getSessionId: () => "test-session",
          getLeafId: () => "leaf-1",
        },
        newSession: vi.fn().mockResolvedValue({}),
      };

      const currentSession = {
        sendUserMessage: vi.fn().mockResolvedValue(undefined),
      };

      await advanceWorkflow(ctx, currentSession);

      // Verify setStatus was called to clear the workflow status
      expect(mockUi.setStatus).toHaveBeenCalledWith("workflower", undefined);
    });

    it("should update footer status when advancing to next step", async () => {
      const { advanceWorkflow } =
        await import("../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/advance/advance-workflow");

      const { findWorkflow } =
        await import("../extension-src/workflower/internals/workflow-orchestration/definitions/registry/global-registry");
      const { readActiveWorkflowState } =
        await import("../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store");

      // Mock the workflow registry to return our test workflow
      vi.mocked(findWorkflow).mockReturnValue(mockWorkflow);

      // Mock the active state to be at step 0 (implement)
      vi.mocked(readActiveWorkflowState).mockResolvedValue({
        id: "feature-dev",
        currentStepIndex: 0,
        gardenName: "test-garden",
        name: "feature-dev",
        workdir: "C:\\test",
        sessionId: "test-session",
        startedAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      const ctx = {
        cwd: "C:\\test",
        ui: mockUi,
        sessionManager: {
          getSessionId: () => "test-session",
          getLeafId: () => "leaf-1",
        },
        newSession: vi.fn(),
      };

      const currentSession = {
        sendUserMessage: vi.fn().mockResolvedValue(undefined),
      };

      await advanceWorkflow(ctx, currentSession);

      // Verify setStatus was called with the correct arguments
      expect(mockUi.setStatus).toHaveBeenCalledWith("workflower", "feature-dev - test");
    });
  });
});
