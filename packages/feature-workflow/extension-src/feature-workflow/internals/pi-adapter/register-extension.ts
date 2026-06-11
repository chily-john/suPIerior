import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import setupWorkflower, { registerWorkflow } from "@supierior/workflower";

import { newFeatureWorkflow } from "../../package-api/new-feature-workflow";
import { takeItAwayWorkflow } from "../../package-api/take-it-away-workflow";

let registered = false;

export default function featureWorkflowExtension(pi: ExtensionAPI): void {
  if (!registered) {
    registerWorkflow(newFeatureWorkflow);
    registerWorkflow(takeItAwayWorkflow);
    registered = true;
  }
  setupWorkflower(pi);
}
