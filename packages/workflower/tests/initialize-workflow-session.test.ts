import { describe, it, expect, vi, beforeEach } from "vitest";
import { initializeWorkflowInSession } from "../extension-src/workflower/internals/workflow-orchestration/runtime/use-cases/start/initialize-workflow-session";
import type { WorkflowDefinition } from "../extension-src/workflower/package-api/workflow-definition.types";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Mock the dependencies
const mockWorkflow: WorkflowDefinition = {
  id: "test-workflow",
  userInvocable: true,
  steps: [],
};

const mockCtx = {
  cwd: "/test/cwd",
  ui: {
    notify: vi.fn(),
    setStatus: vi.fn(),
  },
  sessionManager: {
    getSessionId: () => "test-session-id",
    getSessionFile: () => "/test/session.json",
    getLeafId: () => "test-leaf-id",
  },
};

describe("initializeWorkflowInSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set session name to garden name at workflow kickoff", async () => {
    const mockPi = {
      setSessionName: vi.fn(),
    } as unknown as ExtensionAPI;

    const gardenName = "my-feature";

    await initializeWorkflowInSession(
      mockWorkflow,
      gardenName,
      mockCtx,
      undefined,
      undefined,
      [],
      mockPi,
    );

    expect(mockPi.setSessionName).toHaveBeenCalledWith(gardenName);
  });

  it("should not set session name when pi is not provided", async () => {
    const gardenName = "my-feature";

    await initializeWorkflowInSession(
      mockWorkflow,
      gardenName,
      mockCtx,
      undefined,
      undefined,
      [],
      undefined,
    );

    // Should not throw, just skip setting session name
    // This test mainly verifies the function doesn't crash when pi is undefined
  });

  it("should not set session name when pi.setSessionName is not available", async () => {
    const gardenName = "my-feature";
    const mockPi = {} as unknown as ExtensionAPI;

    await initializeWorkflowInSession(
      mockWorkflow,
      gardenName,
      mockCtx,
      undefined,
      undefined,
      [],
      mockPi,
    );

    // Should not throw, just skip setting session name
  });
});
