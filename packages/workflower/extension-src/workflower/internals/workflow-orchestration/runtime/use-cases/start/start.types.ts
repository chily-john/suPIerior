import type { CurrentSessionPromptSender, WorkflowNotificationUi } from "../workflow-runtime.types";

export type WorkflowCommandContext = {
  cwd: string;
  ui: WorkflowNotificationUi;
  sessionManager: {
    getSessionId(): string;
    getSessionFile(): string | undefined;
  };
  newSession(options: {
    withSession(ctx: WorkflowCommandContext & CurrentSessionPromptSender): Promise<void>;
  }): Promise<{ cancelled?: boolean }>;
};

export type ParsedStartArgs = { ok: true; workflowName: string } | { ok: false; message: string };

export type { CurrentSessionPromptSender };
