import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { findWorkflow } from "@orchestration/definitions/registry/global-registry";

const WORKFLOW_COMMAND_PATTERN = /^\/wf:([a-z0-9_-]+)(?:\s|$)/;

export function registerBlockHiddenWorkflowInput(pi: ExtensionAPI): void {
  pi.on("input", (event, ctx) => {
    const match = event.text.trim().match(WORKFLOW_COMMAND_PATTERN);
    if (!match) return { action: "continue" as const };

    const workflow = findWorkflow(match[1]);
    if (!workflow || workflow.userInvocable !== false) return { action: "continue" as const };

    ctx.ui.notify(`Workflow ${workflow.id} is not user-invokable.`, "error");
    return { action: "handled" as const };
  });
}
