export type WorkflowLifecycleCommandContext = {
  cwd: string;
  ui: {
    notify(message: string, level?: "info" | "warning" | "error"): void;
    setStatus?(key: string, text: string | undefined): void;
  };
  sessionManager: { getSessionId(): string };
};
