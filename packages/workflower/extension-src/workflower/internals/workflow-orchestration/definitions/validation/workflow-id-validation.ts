const WORKFLOW_ID_PATTERN = /^[a-z0-9_-]+$/;

export function validateWorkflowId(id: string): void {
  if (!WORKFLOW_ID_PATTERN.test(id)) {
    throw new Error(`Invalid workflow id: ${id}`);
  }
}
