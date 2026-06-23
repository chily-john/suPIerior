import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerGeneratedStartCommands } from "./commands/generated-start-commands";
import { registerNextCommand } from "./commands/next-command";
import { registerWfCommand } from "./commands/wf-command";
import { registerAutoNextOnAgentEnd } from "./events/auto-next-on-agent-end";
import { registerBlockHiddenWorkflowInput } from "./events/block-hidden-workflow-input";
import { registerScopedContextOnContextRequest } from "./events/scoped-context-on-context-request";
import { registerPrivateSkills } from "@orchestration/runtime/use-cases/private-skills/private-skill-registry";
import { loadPackageWorkflowerSkills } from "./private-skills/load-package-workflower-skills";
import { registerWorkflowerPromptRenderer } from "./rendering/register-workflower-prompt-renderer";
import { registerGardenStateTools } from "./tools/register-garden-state-tools";
import { registerHandoffTool } from "./tools/register-handoff-tool";

type WorkflowerRuntimeGlobal = typeof globalThis & {
  __supieriorWorkflowerRegisteredApis?: WeakSet<ExtensionAPI>;
  __supieriorWorkflowerRuntimeDisposers?: WeakMap<ExtensionAPI, Array<() => void>>;
};

const runtimeGlobal = globalThis as WorkflowerRuntimeGlobal;
const registeredApis = (runtimeGlobal.__supieriorWorkflowerRegisteredApis ??=
  new WeakSet<ExtensionAPI>());
const runtimeDisposers = (runtimeGlobal.__supieriorWorkflowerRuntimeDisposers ??= new WeakMap<
  ExtensionAPI,
  Array<() => void>
>());

export type WorkflowerSetupOptions = {
  /** URL or file path for the calling package extension module. */
  packageUrl?: string;
};

export function registerExtension(pi: ExtensionAPI, options: WorkflowerSetupOptions = {}): void {
  if (options.packageUrl !== undefined) {
    const result = loadPackageWorkflowerSkills(options.packageUrl);
    result.diagnostics.push(...registerPrivateSkills(result.skills));
  }

  if (registeredApis.has(pi)) return;
  registeredApis.add(pi);

  const disposers: Array<() => void> = [];
  runtimeDisposers.set(pi, disposers);

  pi.on("session_shutdown", () => {
    for (const dispose of runtimeDisposers.get(pi) ?? []) dispose();
    runtimeDisposers.delete(pi);
    registeredApis.delete(pi);
  });

  registerHandoffTool(pi);
  registerGardenStateTools(pi);
  registerWorkflowerPromptRenderer(pi);
  registerScopedContextOnContextRequest(pi);
  registerAutoNextOnAgentEnd(pi);
  registerBlockHiddenWorkflowInput(pi);
  registerWfCommand(pi);
  disposers.push(registerGeneratedStartCommands(pi));
  registerNextCommand(pi);
}
