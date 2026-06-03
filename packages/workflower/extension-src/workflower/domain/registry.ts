import type { WorkflowDefinition } from "@domain/workflow";
import { featureToGithubIssuesWorkflow } from "@/workflows/feature-to-github-issues";

const workflows: WorkflowDefinition[] = [featureToGithubIssuesWorkflow];
const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

export function listWorkflows(): WorkflowDefinition[] {
  return [...workflows];
}

export function findWorkflow(workflowId: string): WorkflowDefinition | undefined {
  return workflowById.get(workflowId);
}
