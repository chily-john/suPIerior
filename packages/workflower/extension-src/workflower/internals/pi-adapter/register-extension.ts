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

// Use global to share state across all Workflower extensions in the same process.
// Pi can load each package through a distinct ExtensionAPI wrapper while those wrappers
// still write to the same command/tool registry.
const globalState = global as {
  __workflowerCoreRegistered?: boolean;
  __workflowerRuntimeDisposers?: WeakMap<ExtensionAPI, Array<() => void>>;
  __workflowerCoreCommandsRegistered?: WeakSet<ExtensionAPI>;
};

const runtimeDisposers = (globalState.__workflowerRuntimeDisposers ??= new WeakMap<
  ExtensionAPI,
  Array<() => void>
>());
const coreCommandsRegistered = (globalState.__workflowerCoreCommandsRegistered ??= new WeakSet<
  ExtensionAPI
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

  const disposers: Array<() => void> = [];

  // Track disposers for this Pi instance
  if (!runtimeDisposers.has(pi)) {
    runtimeDisposers.set(pi, disposers);

    pi.on("session_shutdown", () => {
      for (const dispose of runtimeDisposers.get(pi) ?? []) dispose();
      runtimeDisposers.delete(pi);
      coreCommandsRegistered.delete(pi);
      globalState.__workflowerCoreRegistered = false;
    });
  } else {
    // Reuse existing disposers array for this Pi instance
    runtimeDisposers.get(pi)?.push(...disposers);
  }

  // Register core commands/events/tools only once for the shared Pi runtime. When multiple
  // workflow packages are loaded, later packages still contribute workflows/skills, while the
  // first Workflower runtime listener registers generated /wf:<id> commands for them.
  if (!coreCommandsRegistered.has(pi) && globalState.__workflowerCoreRegistered !== true) {
    coreCommandsRegistered.add(pi);
    globalState.__workflowerCoreRegistered = true;

    registerHandoffTool(pi);
    registerGardenStateTools(pi);
    registerWorkflowerPromptRenderer(pi);
    registerScopedContextOnContextRequest(pi);
    registerAutoNextOnAgentEnd(pi);
    registerBlockHiddenWorkflowInput(pi);
    registerWfCommand(pi);
    registerNextCommand(pi);

    disposers.push(registerGeneratedStartCommands(pi));
  }
}
