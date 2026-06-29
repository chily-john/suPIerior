import type { WorkflowNotificationUi } from "./workflow-runtime.types";

// Constants for footer status
export const WORKFLOW_STATUS_KEY = "workflower";

export const WORKFLOW_STEP_STATUS_FORMAT = (workflowId: string, stepId: string): string =>
  `${workflowId} - ${stepId}`;

// Utility function to update workflow status in the footer
export function updateWorkflowStatus(
  ui: WorkflowNotificationUi,
  workflowId: string,
  stepId: string,
): void {
  if (ui.setStatus) {
    ui.setStatus(WORKFLOW_STATUS_KEY, WORKFLOW_STEP_STATUS_FORMAT(workflowId, stepId));
  }
}

// Utility function to clear workflow status from the footer
export function clearWorkflowStatus(ui: WorkflowNotificationUi): void {
  if (ui.setStatus) {
    ui.setStatus(WORKFLOW_STATUS_KEY, undefined);
  }
}
