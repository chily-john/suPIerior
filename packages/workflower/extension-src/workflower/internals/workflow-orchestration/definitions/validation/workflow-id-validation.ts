export function validateWorkflowId(id: string): void {
  if (!isCommandSafeWorkflowId(id)) {
    throw new Error(`Invalid workflow id: ${id}`);
  }
}

function isCommandSafeWorkflowId(id: string): boolean {
  if (id.length === 0) return false;
  if (id.startsWith("/") || id.startsWith("wf:")) return false;
  if (/\s/.test(id) || /[\u0000-\u001F\u007F]/.test(id)) return false;
  return !/["'`\\|<>{}\[\]]/.test(id);
}
