const WORKFLOW_ID_PATTERN = /^[a-z0-9_-]+$/;

export function assertValidWorkflowId(workflowId: string): void {
  if (!WORKFLOW_ID_PATTERN.test(workflowId)) {
    throw new Error(`Invalid workflow id: ${workflowId}`);
  }
}
