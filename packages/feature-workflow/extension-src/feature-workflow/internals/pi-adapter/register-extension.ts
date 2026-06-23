import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import setupWorkflower, { registerWorkflow } from "@supierior/workflower";

import { counterLoopWorkflow } from "../../package-api/counter-loop-workflow";
import { counterWorkflow } from "../../package-api/counter-workflow";
import { newFeatureWorkflow } from "../../package-api/new-feature-workflow";
import { takeItAwayWorkflow } from "../../package-api/take-it-away-workflow";

let workflowsRegistered = false;

export default function featureWorkflowExtension(pi: ExtensionAPI): void {
  if (!workflowsRegistered) {
    registerWorkflow(newFeatureWorkflow);
    registerWorkflow(takeItAwayWorkflow);
    registerWorkflow(counterWorkflow);
    registerWorkflow(counterLoopWorkflow);
    workflowsRegistered = true;
  }

  setupWorkflower(pi, { packageUrl: import.meta.url });
}
