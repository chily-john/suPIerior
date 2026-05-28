import type { FeatureFlowConfig } from "@domain/config";
import type { SelectedFeatureTemplate } from "@domain/feature-templates";
import type { DiscoveryContext, DiscoveryState } from "@domain/model";

export const discoveryPrompt = `Ask challenging but bounded discovery questions. Avoid broad codebase inspection unless the user references files or targeted inspection is required.`;

export function renderDiscoveryPrompt(state: DiscoveryState, config: FeatureFlowConfig): string {
  return [
    "You are conducting feature discovery as a thoughtful product and implementation partner.",
    "Your task is to grill the user relentlessly until you come to a complete understanding of the feature.",
    "Ask rich natural-language question blocks that uncover intent, scope, constraints, risks, expected outputs, and validation needs.",
    "Remain kind and collaborative, but push back when the request or an answer is clearly contradictory, technically inconsistent, or points toward an obviously worse approach.",
    "When a simpler, safer, or more effective alternative is clearly available, briefly recommend it inside the next question block and ask the user to confirm or correct that direction.",
    "Return JSON only using this exact minimal envelope:",
    '{"message":"optional note to the user","readyToGenerate":false,"questions":[{"id":"q1","text":"Natural rich question block"}]}',
    "Rules:",
    "- Re-evaluate the full feature state and all prior answers every turn.",
    "- You may keep, revise, reorder, drop, or add unanswered questions.",
    "- Ask one or more candidate questions, but only one will be presented before you are called again.",
    "- Preserve useful formatting in question text: newlines, blank lines, bullets, numbered lists, indentation, and light Markdown emphasis are allowed.",
    "- If you push back, do it kindly and specifically; do not be argumentative, and continue gathering requirements after the challenge.",
    "- Never reuse an answered question id; follow-ups require new ids.",
    "- If the user indicates they want to proceed, decide whether enough is known and return readyToGenerate true when appropriate.",
    "- If readyToGenerate is false, include at least one unanswered question.",
    renderBudget(state, config),
    "Current feature state:",
    JSON.stringify(
      {
        description: state.description,
        slug: state.slug,
        turns: state.turns,
        answeredQuestionIds: state.answers.map((answer) => answer.questionId),
        answers: state.answers,
        lastModelMessage: state.lastModelMessage,
      },
      null,
      2,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function renderRepairDiscoveryPrompt(badOutput: string, error: string): string {
  return [
    "Your previous feature discovery response was malformed.",
    `Validation error: ${error}`,
    "Malformed output:",
    badOutput,
    "Return JSON only matching this shape:",
    '{"message":"optional note to the user","readyToGenerate":false,"questions":[{"id":"q1","text":"Natural rich question block"}]}',
    "Requirements: readyToGenerate must be boolean; questions must be an array; each question needs non-empty string id and text; message is optional string.",
  ].join("\n\n");
}

export function renderReviewerPrompt(draftPath: string): string {
  return `You are a fresh-context feature reviewer. Read only ${draftPath} and ask only blocker questions required to produce aligned feature.md and plan.md artifacts. If there are no blockers, write final artifacts once and stop.`;
}

export function renderFeatureDocumentPrompt(
  context: DiscoveryContext,
  template: SelectedFeatureTemplate,
  blockerAnswers: string[] = [],
): string {
  return [
    "Generate the final feature handoff artifact as Markdown for another coding agent to implement.",
    "Use the selected document template as the output structure and follow it semantically.",
    "Synthesize only from the discovery context below. Do not interview the user or ask new questions.",
    "When describing implementation, identify likely modules, interfaces, architectural choices, contracts, and interactions without using brittle file paths or code snippets unless they encode a decision more precisely than prose.",
    "When describing testing, prefer external behavior over implementation details. If validation is user-owned or manual, record that clearly.",
    "Return only the final Markdown artifact; do not wrap it in fences or explain your process.",
    "Be very detailed on every section, include all information and context that is relevant.",
    `Selected template: ${template.label}${template.source === "custom" ? " (custom .pi/feature-templates file)" : " (built-in default)"}`,
    "Template:",
    template.content.trim(),
    "Discovery context:",
    JSON.stringify(
      {
        slug: context.slug,
        description: context.description,
        intent: context.intent,
        answers: context.answers,
        decisions: context.decisions,
        constraints: context.constraints,
        assumptions: context.assumptions,
        requirements: context.requirements,
        openQuestions: [...context.openQuestions, ...blockerAnswers],
      },
      null,
      2,
    ),
  ].join("\n\n");
}

function renderBudget(state: DiscoveryState, config: FeatureFlowConfig): string | undefined {
  const parts: string[] = [];
  if (typeof config.questions.maxTurns === "number") {
    parts.push(
      `Turns used: ${state.turns}; remaining turn budget: ${Math.max(0, config.questions.maxTurns - state.turns)} of ${config.questions.maxTurns}.`,
    );
  }
  if (typeof config.questions.maxQuestions === "number") {
    parts.push(
      `Questions answered: ${state.answers.length}; remaining question budget: ${Math.max(0, config.questions.maxQuestions - state.answers.length)} of ${config.questions.maxQuestions}.`,
    );
  }
  if (!parts.length) return undefined;
  return `Configured budget: ${parts.join(" ")} Optimize the next questions to fit the remaining budget, or return readyToGenerate true if enough is known.`;
}
