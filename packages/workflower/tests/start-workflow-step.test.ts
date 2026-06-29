import { describe, it, expect, vi, beforeEach } from "vitest";
import { startWorkflowStep } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start-step/start-workflow-step";
import type { WorkflowDefinition } from "../extension-src/workflower/package-api/workflow-definition.types";
import type { ActiveWorkflowState } from "../extension-src/workflower/internals/workflow-orchestration/runtime/active-state/active-state.types";
import type { CurrentSessionPromptSender, WorkflowNotificationUi } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/workflow-runtime.types";

// Mock workflow definition
const mockWorkflow: WorkflowDefinition = {
  id: "feature-dev",
  userInvocable: true,
  steps: [
    { id: "implement", command: "test command" },
    { id: "review", command: "test command 2" },
  ],
};

// Mock active workflow state
const mockState: ActiveWorkflowState = {
  sessionId: "test-session-id",
  sessionFile: "/test/session.json",
  id: "feature-dev",
  name: "Feature Dev",
  gardenName: "feature-dev-garden",
  gardenPath: "/test/garden",
  activeFlowerName: "feature-dev",
  activeFlowerPath: "/test/garden/feature-dev",
  workdir: "/test/garden/feature-dev",
  currentStepIndex: 0,
  contextBoundaryEntryId: "test-entry-id",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock prompt sender
const mockPromptSender: CurrentSessionPromptSender = {
  sendUserMessage: vi.fn().mockResolvedValue(undefined),
};

// Mock UI context with setStatus
const mockUi: WorkflowNotificationUi = {
  notify: vi.fn(),
  setStatus: vi.fn(),
};

describe("startWorkflowStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set footer status to workflow and step id", async () => {
    // This test should fail initially because setStatus is not yet implemented
    await startWorkflowStep(mockWorkflow, mockState, 0, mockPromptSender, { ui: mockUi });

    // This assertion should fail until we implement the feature
    expect(mockUi.setStatus).toHaveBeenCalledWith("workflower", "feature-dev - implement");
  });
});
