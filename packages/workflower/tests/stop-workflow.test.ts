import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkflowNotificationUi } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/workflow-runtime.types";

// Mock the active state store
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store",
  () => ({
    readActiveWorkflowState: vi.fn(),
    deleteActiveWorkflowState: vi.fn().mockResolvedValue(undefined),
  })
);

// Mock the resume state store
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/resume/resume-state-store",
  () => ({
    persistResumeMetadataForActiveState: vi.fn().mockResolvedValue(undefined),
  })
);

// Mock the active state paths
vi.mock(
  "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-paths",
  () => ({
    resolveActiveStatePath: vi.fn(() => "mock-path"),
  })
);

describe("stop-workflow", () => {
  let mockUi: WorkflowNotificationUi & { setStatus: vi.Mock };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUi = {
      notify: vi.fn(),
      setStatus: vi.fn(),
    };
  });

  describe("footer status clearing", () => {
    it("should clear footer status when workflow is stopped", async () => {
      const { stopWorkflow } = await import(
        "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/manage-active/stop-active"
      );

      const { readActiveWorkflowState } = await import(
        "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state-store"
      );

      // Mock the active state to return a workflow
      vi.mocked(readActiveWorkflowState).mockResolvedValue({
        id: "feature-dev",
        currentStepIndex: 1,
        gardenName: "test-garden",
        name: "feature-dev",
        workdir: "C:\\test",
        sessionId: "test-session",
        updatedAt: "2026-01-02T03:04:05.000Z",
      });

      const ctx = {
        cwd: "C:\\test",
        ui: mockUi,
        sessionManager: {
          getSessionId: () => "test-session",
        },
      };

      await stopWorkflow(ctx);

      // Verify setStatus was called to clear the workflow status
      expect(mockUi.setStatus).toHaveBeenCalledWith('workflower', undefined);
    });
  });
});
