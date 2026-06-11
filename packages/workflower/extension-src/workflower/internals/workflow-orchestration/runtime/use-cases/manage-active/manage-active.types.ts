export type WorkflowLifecycleCommandContext = {
  cwd: string;
  ui: { notify(message: string, level?: "info" | "warning" | "error"): void };
  sessionManager: { getSessionId(): string };
};
