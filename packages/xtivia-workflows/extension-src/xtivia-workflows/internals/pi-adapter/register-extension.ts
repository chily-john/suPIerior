import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import setupWorkflower, { registerWorkflow } from "@supierior/workflower";

import { wpMigrationFinalizeWorkflow } from "../../package-api/wp-migration-finalize-workflow";
import { wpMigrationPlanLoopWorkflow } from "../../package-api/wp-migration-plan-loop-workflow";
import { wpMigrationStoriesSplitWorkflow } from "../../package-api/wp-migration-stories-split-workflow";
import { wpMigrationStoryImplementationLoopWorkflow } from "../../package-api/wp-migration-story-implementation-loop-workflow";
import { wpPageMigrationWorkflow } from "../../package-api/wp-page-migration-workflow";
import { registerXtiviaWorkflowCommands } from "../workflow-routing/register-xtivia-workflow-commands";

let workflowsRegistered = false;

export default function xtiviaWorkflowsExtension(pi: ExtensionAPI): void {
  if (!workflowsRegistered) {
    registerWorkflow(wpPageMigrationWorkflow);
    registerWorkflow(wpMigrationPlanLoopWorkflow);
    registerWorkflow(wpMigrationStoriesSplitWorkflow);
    registerWorkflow(wpMigrationStoryImplementationLoopWorkflow);
    registerWorkflow(wpMigrationFinalizeWorkflow);
    registerXtiviaWorkflowCommands();
    workflowsRegistered = true;
  }

  setupWorkflower(pi, { packageUrl: import.meta.url });
}
