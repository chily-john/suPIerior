import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerGeneratedStartCommands } from "./commands/generated-start-commands";
import { registerNextCommand } from "./commands/next-command";
import { registerWfCommand } from "./commands/wf-command";
import { registerAutoNextOnAgentEnd } from "./events/auto-next-on-agent-end";
import { registerScopedContextOnContextRequest } from "./events/scoped-context-on-context-request";

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

export function registerExtension(pi: ExtensionAPI): void {
  if (registeredApis.has(pi)) return;
  registeredApis.add(pi);

  const disposers: Array<() => void> = [];
  runtimeDisposers.set(pi, disposers);

  pi.on("session_shutdown", () => {
    for (const dispose of runtimeDisposers.get(pi) ?? []) dispose();
    runtimeDisposers.delete(pi);
    registeredApis.delete(pi);
  });

  registerScopedContextOnContextRequest(pi);
  registerAutoNextOnAgentEnd(pi);
  registerWfCommand(pi);
  disposers.push(registerGeneratedStartCommands(pi));
  registerNextCommand(pi);
}
