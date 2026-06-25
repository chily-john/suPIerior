import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { createWorkflowerRuntime } from "@package-api/create-workflower-runtime";

const STATE_PROMPT_GUIDELINES = [
  "Use workflower_state_set to save small structured facts for the active Workflower garden, such as review.rating or implementation.summary.",
  "Use workflower_state_get to read previously saved active-garden facts when a workflow step depends on them.",
  "Use workflower_state_list to inspect which active-garden state keys are available without opening files.",
  "Use workflower_handoff, not printed /wf commands, when an agent must continue the active garden in another workflow.",
  "Do not use garden state for large logs, diffs, or long reports; write those as step outputs instead.",
];

export function registerGardenStateTools(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "workflower_state_set",
    label: "Workflower State Set",
    description: "Set a small JSON value in the active garden state for Workflower.",
    promptSnippet: "Save small structured facts to active Workflower garden state.",
    promptGuidelines: STATE_PROMPT_GUIDELINES,
    parameters: Type.Object({
      key: Type.String({ description: "Flat garden state key, such as review.rating." }),
      value: Type.Any({ description: "JSON-compatible value to save for the active garden." }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = await createWorkflowerRuntime(pi, ctx, {
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
      }).state.set(params.key, params.value);

      return {
        content: [{ type: "text", text: result.message }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "workflower_state_get",
    label: "Workflower State Get",
    description: "Get one value from the active garden state for Workflower.",
    promptSnippet: "Read a structured fact from active Workflower garden state.",
    promptGuidelines: STATE_PROMPT_GUIDELINES,
    parameters: Type.Object({
      key: Type.String({ description: "Flat garden state key, such as review.rating." }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = await createWorkflowerRuntime(pi, ctx, {
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
      }).state.get(params.key);

      return {
        content: [{ type: "text", text: describeGetResult(result) }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "workflower_state_list",
    label: "Workflower State List",
    description: "List keys in the active garden state for Workflower.",
    promptSnippet: "List active Workflower garden state keys.",
    promptGuidelines: STATE_PROMPT_GUIDELINES,
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const result = await createWorkflowerRuntime(pi, ctx, {
        sendUserMessage: (prompt) => pi.sendUserMessage(prompt, { deliverAs: "followUp" }),
      }).state.list();

      return {
        content: [{ type: "text", text: describeListResult(result) }],
        details: result,
      };
    },
  });
}

function describeGetResult(
  result: Awaited<ReturnType<ReturnType<typeof createWorkflowerRuntime>["state"]["get"]>>,
): string {
  if (!result.ok) return result.message;
  if (!result.found) return `Garden state key ${result.key} is not set.`;
  return `Garden state ${result.key}: ${JSON.stringify(result.entry?.value)}`;
}

function describeListResult(
  result: Awaited<ReturnType<ReturnType<typeof createWorkflowerRuntime>["state"]["list"]>>,
): string {
  if (!result.ok) return result.message;
  if (result.keys.length === 0) return "No garden state keys are set.";
  return `Garden state keys: ${result.keys.join(", ")}`;
}
