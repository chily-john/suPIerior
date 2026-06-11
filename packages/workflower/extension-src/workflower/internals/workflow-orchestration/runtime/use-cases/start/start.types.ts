import type { CurrentSessionPromptSender, WorkflowNotificationUi } from "../workflow-runtime.types";

export type WorkflowCommandContext = {
  cwd: string;
  ui: WorkflowNotificationUi;
  sessionManager: {
    getSessionId(): string;
    getSessionFile(): string | undefined;
    getLeafId?(): string | null | undefined;
  };
};

export type ParsedStartArgs = { ok: true; workflowName: string } | { ok: false; message: string };

export type { CurrentSessionPromptSender };
