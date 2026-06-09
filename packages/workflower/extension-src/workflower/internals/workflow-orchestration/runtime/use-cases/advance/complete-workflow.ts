import { unlink } from "node:fs/promises";
import type { ActiveWorkflowState } from "@orchestration/runtime/active-state/active-state.types";
import { removeWorkflowWorkdir } from "@orchestration/runtime/artifacts/remove-artifacts";
import type { AdvanceWorkflowOptions, WorkflowAdvanceContext } from "./advance.types";

export async function completeWorkflow(
  ctx: WorkflowAdvanceContext,
  state: ActiveWorkflowState,
  workflow: { id: string; cleanupOnCompletion?: boolean; clearOnCompletion?: boolean },
  activeStatePath: string,
  options: AdvanceWorkflowOptions,
): Promise<void> {
  await unlink(activeStatePath).catch(() => undefined);
  if (workflow.cleanupOnCompletion !== false) {
    try {
      await removeWorkflowWorkdir(ctx.cwd, state.workdir);
    } catch (error) {
      ctx.ui.notify(`Failed to clean up completed workflow files: ${formatError(error)}`, "error");
      return;
    }
  }

  if (workflow.clearOnCompletion === false) {
    ctx.ui.notify(`Workflow ${state.id} complete.`, "info");
    return;
  }

  if (options.allowSessionReplacementOnCompletion && ctx.newSession) {
    let result: { cancelled?: boolean };
    try {
      result = await ctx.newSession({
        withSession: async (replacementCtx) => {
          replacementCtx.ui.notify(`Workflow ${state.id} complete.`, "info");
        },
      });
    } catch (error) {
      ctx.ui.notify(`Failed to clear completed workflow session: ${formatError(error)}`, "error");
      return;
    }

    if (result.cancelled) {
      ctx.ui.notify("Session creation was cancelled after workflow completion.", "error");
    }
    return;
  }

  ctx.ui.notify(
    `Workflow ${state.id} complete. Completion ran from auto-next, so session context was not cleared automatically.`,
    "info",
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
