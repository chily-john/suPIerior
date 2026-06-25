import { addWorkflowerCommandToRegistry } from "@orchestration/definitions/private-commands/private-command-registry";
import type { WorkflowerCommandDefinition } from "./workflower-command.types";

export function registerWorkflowerCommand(command: WorkflowerCommandDefinition): void {
  const diagnostic = addWorkflowerCommandToRegistry(command);
  if (diagnostic) console.warn(diagnostic.message);
}
