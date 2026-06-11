import type { WorkflowDefinition } from "@package-api/workflow-definition.types";
import {
  listWorkflows,
  onWorkflowRegistered,
} from "@orchestration/definitions/registry/global-registry";

export function listStartableWorkflows(): WorkflowDefinition[] {
  return listWorkflows();
}

export function onStartableWorkflowRegistered(
  listener: (workflow: WorkflowDefinition) => void,
): () => void {
  return onWorkflowRegistered(listener);
}
