import { buildSessionContext, type ExtensionAPI, type SessionEntry } from "@mariozechner/pi-coding-agent";
import { buildScopedWorkflowContext } from "@orchestration/runtime/use-cases/scope-context/build-scoped-workflow-context";

export function registerScopedContextOnContextRequest(pi: ExtensionAPI): void {
  pi.on("context", async (_event, ctx) => {
    return buildScopedWorkflowContext<SessionEntry, ReturnType<typeof buildSessionContext>["messages"][number]>({
      cwd: ctx.cwd,
      sessionManager: ctx.sessionManager,
      buildMessages: (entries) => buildSessionContext(entries).messages,
    });
  });
}
