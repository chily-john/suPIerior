export interface AnswerRecord<TAnswer = string | string[] | boolean> {
  questionId: string;
  prompt: string;
  answer: TAnswer;
  summary: string;
  recordInContext?: boolean;
}

export interface DiscoveryQuestion {
  id: string;
  text: string;
}

export interface DiscoveryModelResponse {
  message?: string;
  readyToGenerate: boolean;
  estimatedNumberOfQuestionsRemaining: number;
  question?: DiscoveryQuestion;
}

export interface DiscoveryAnswer {
  questionId: string;
  questionText: string;
  answer: string;
}

export interface DiscoveryState {
  description: string;
  slug: string;
  answers: DiscoveryAnswer[];
  lastModelMessage?: string;
  turns: number;
}

export interface DiscoveryContext {
  description: string;
  slug: string;
  answers: AnswerRecord[];
  intent: string;
  decisions: string[];
  constraints: string[];
  assumptions: string[];
  requirements: string[];
  openQuestions: string[];
}

export function summarizeDiscovery(
  description: string,
  slug: string,
  stateOrAnswers: DiscoveryState | AnswerRecord[],
): DiscoveryContext {
  if (Array.isArray(stateOrAnswers))
    return summarizeLegacyAnswers(description, slug, stateOrAnswers);

  const state = stateOrAnswers;
  const answers = state.answers.map(
    (answer): AnswerRecord<string> => ({
      questionId: answer.questionId,
      prompt: answer.questionText,
      answer: answer.answer,
      summary: `${answer.questionText}: ${answer.answer}`,
      recordInContext: true,
    }),
  );

  return {
    description,
    slug,
    answers,
    intent: state.lastModelMessage || description,
    decisions: compact([
      `Feature slug: ${slug}`,
      state.lastModelMessage && `Model readiness note: ${state.lastModelMessage}`,
    ]),
    constraints: [],
    assumptions: [],
    requirements: answers.map((answer) => answer.summary),
    openQuestions: [],
  };
}

function summarizeLegacyAnswers(
  description: string,
  slug: string,
  answers: AnswerRecord[],
): DiscoveryContext {
  const byId = new Map(answers.map((answer) => [answer.questionId, String(answer.answer)]));
  return {
    description,
    slug,
    answers: answers.filter((answer) => answer.recordInContext),
    intent: byId.get("problem") || description,
    decisions: compact([
      `Feature slug: ${slug}`,
      byId.get("artifacts") && `Expected outputs/changes: ${byId.get("artifacts")}`,
    ]),
    constraints: compact([
      byId.get("constraints"),
      byId.get("scope") && `V1 scope boundary: ${byId.get("scope")}`,
    ]),
    assumptions: compact([byId.get("users") && `Primary user/context: ${byId.get("users")}`]),
    requirements: compact([byId.get("success"), byId.get("artifacts")]),
    openQuestions: compact([
      byId.get("unknowns"),
      byId.get("risks") && `Risk to watch: ${byId.get("risks")}`,
    ]),
  };
}

function compact(values: Array<string | undefined | false>): string[] {
  return values.filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
}
