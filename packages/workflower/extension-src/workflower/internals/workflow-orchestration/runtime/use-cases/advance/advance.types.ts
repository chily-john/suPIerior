import type { CurrentSessionPromptSender, WorkflowNotificationUi } from "../workflow-runtime.types";

export type WorkflowAdvanceContext = {
  cwd: string;
  ui: WorkflowNotificationUi;
  sessionManager: {
    getSessionId(): string;
    getLeafId(): string | null | undefined;
  };
  newSession?(options: {
    withSession(ctx: { ui: WorkflowNotificationUi }): Promise<void>;
  }): Promise<{ cancelled?: boolean }>;
};

export type AdvanceWorkflowOptions = {
  currentSession?: CurrentSessionPromptSender;
  allowSessionReplacementOnCompletion?: boolean;
};
