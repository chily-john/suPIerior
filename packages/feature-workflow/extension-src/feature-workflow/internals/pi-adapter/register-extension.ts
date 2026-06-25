import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import setupWorkflower, { registerWorkflow } from "@supierior/workflower";

import { featureDocWorkflow } from "../../package-api/feature-doc-workflow";
import { implementationDocLoopWorkflow } from "../../package-api/implementation-doc-loop-workflow";
import { implementationStoriesSplitWorkflow } from "../../package-api/implementation-stories-split-workflow";
import { newFeatureWorkflow } from "../../package-api/new-feature-workflow";
import { storyImplementationLoopWorkflow } from "../../package-api/story-implementation-loop-workflow";
import { takeItAwayWorkflow } from "../../package-api/take-it-away-workflow";
import { registerFeatureWorkflowCommands } from "../workflow-routing/register-feature-workflow-commands";

let workflowsRegistered = false;

export default function featureWorkflowExtension(pi: ExtensionAPI): void {
  if (!workflowsRegistered) {
    registerWorkflow(newFeatureWorkflow);
    registerWorkflow(takeItAwayWorkflow);
    registerWorkflow(featureDocWorkflow);
    registerWorkflow(implementationDocLoopWorkflow);
    registerWorkflow(implementationStoriesSplitWorkflow);
    registerWorkflow(storyImplementationLoopWorkflow);
    registerFeatureWorkflowCommands();
    workflowsRegistered = true;
  }

  setupWorkflower(pi, { packageUrl: import.meta.url });
}
