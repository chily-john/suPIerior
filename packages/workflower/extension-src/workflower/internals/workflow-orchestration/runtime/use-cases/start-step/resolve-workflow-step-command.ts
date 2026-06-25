import type { WorkflowStep } from "@package-api/workflow-definition.types";
import type { WorkflowerCommandContext } from "@package-api/workflower-command.types";
import type { WorkflowerStepCommandResolution } from "@orchestration/definitions/private-commands/private-command-resolution.types";
import { findWorkflowerCommand } from "@orchestration/definitions/private-commands/private-command-registry";
import { parseWorkflowerPrivateCommandInvocation } from "@orchestration/definitions/private-commands/parse-private-command-invocation";
import { expandPrivateSkillCommand } from "@orchestration/prompting/private-skills/expand-private-skill-command";

export type ResolveWorkflowerStepCommandContext = Omit<
  WorkflowerCommandContext,
  "stepId" | "stepName"
>;

export async function resolveWorkflowerStepCommand(
  step: WorkflowStep,
  runtimeContext: ResolveWorkflowerStepCommandContext,
): Promise<WorkflowerStepCommandResolution | undefined> {
  const expandedPrivateSkill = expandPrivateSkillCommand(step.command);
  if (expandedPrivateSkill !== undefined) {
    return { kind: "private-skill-prompt", content: expandedPrivateSkill };
  }

  const invocation = parseWorkflowerPrivateCommandInvocation(step.command);
  if (!invocation) return undefined;

  const command = findWorkflowerCommand(invocation.name);
  if (!command) return undefined;

  const result = await command.handler(invocation.args, {
    ...runtimeContext,
    stepId: step.id,
  });

  if (result.kind === "prompt") {
    return { kind: "private-command-prompt", content: result.content };
  }

  return { kind: "private-command-none" };
}

export type { WorkflowerStepCommandResolution };
export { parseWorkflowerPrivateCommandInvocation };
