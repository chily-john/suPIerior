import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import setupWorkflower, { registerWorkflow } from "@supierior/workflower";

import { counterLoopWorkflow } from "../../package-api/counter-loop-workflow";
import { counterWorkflow } from "../../package-api/counter-workflow";
import { statefulGrillingFinalizeWorkflow } from "../../package-api/stateful-grilling-finalize-workflow";
import { statefulGrillingWorkflow } from "../../package-api/stateful-grilling-workflow";

let workflowsRegistered = false;

export default function experimentalWorkflowsExtension(pi: ExtensionAPI): void {
  if (!workflowsRegistered) {
    registerWorkflow(counterWorkflow);
    registerWorkflow(counterLoopWorkflow);
    registerWorkflow(statefulGrillingWorkflow);
    registerWorkflow(statefulGrillingFinalizeWorkflow);
    workflowsRegistered = true;
  }

  setupWorkflower(pi, { packageUrl: import.meta.url });
}
