import type { WorkflowerCommandDefinition } from "@package-api/workflower-command.types";

export type WorkflowerCommandDiagnostic = {
  level: "warning" | "error";
  message: string;
  commandName: string;
};

type PrivateCommandRegistry = {
  commandByName: Map<string, WorkflowerCommandDefinition>;
};

type PrivateCommandRegistryGlobal = typeof globalThis & {
  __supieriorWorkflowerPrivateCommandRegistry?: PrivateCommandRegistry;
};

const registryGlobal = globalThis as PrivateCommandRegistryGlobal;
const registry = (registryGlobal.__supieriorWorkflowerPrivateCommandRegistry ??= {
  commandByName: new Map<string, WorkflowerCommandDefinition>(),
});

export function addWorkflowerCommandToRegistry(
  command: WorkflowerCommandDefinition,
): WorkflowerCommandDiagnostic | undefined {
  validateWorkflowerCommandName(command.name);

  const existingCommand = registry.commandByName.get(command.name);
  if (existingCommand === undefined) {
    registry.commandByName.set(command.name, command);
    return undefined;
  }

  if (existingCommand === command) return undefined;

  return {
    level: "warning",
    message: `Workflower private command name already registered: ${command.name}`,
    commandName: command.name,
  };
}

export function findWorkflowerCommand(name: string): WorkflowerCommandDefinition | undefined {
  return registry.commandByName.get(name);
}

export function listWorkflowerCommands(): WorkflowerCommandDefinition[] {
  return [...registry.commandByName.values()];
}

export function clearWorkflowerCommandsForTests(): void {
  registry.commandByName.clear();
}

function validateWorkflowerCommandName(name: string): void {
  if (name.length === 0 || name.trim() !== name || /\s/.test(name) || name.startsWith("/")) {
    throw new Error(
      "Invalid Workflower private command name: command names must be non-empty slash-free tokens.",
    );
  }
}
