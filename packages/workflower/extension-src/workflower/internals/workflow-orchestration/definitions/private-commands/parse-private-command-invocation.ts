export type WorkflowerPrivateCommandInvocation = {
  name: string;
  args: string;
};

export function parseWorkflowerPrivateCommandInvocation(
  command: string,
): WorkflowerPrivateCommandInvocation | undefined {
  const trimmed = command.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("/skill:")) return undefined;

  const body = trimmed.slice(1);
  if (body.length === 0) return undefined;

  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(body);
  if (!match) return undefined;

  const [, name, args = ""] = match;
  return { name, args };
}
