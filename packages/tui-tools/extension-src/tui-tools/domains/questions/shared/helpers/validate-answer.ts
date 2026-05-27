import type { QuestionAnswer, QuestionDefinition } from "../models/question-definition";

export async function validateAnswer(
  question: QuestionDefinition,
  answer: QuestionAnswer,
): Promise<void> {
  if (question.kind === "choice" && !question.options?.some((option) => option.value === answer)) {
    throw new Error("Answer must be one of the configured choices.");
  }
  if (question.kind === "multi-choice") {
    if (!Array.isArray(answer)) throw new Error("Answer must be a list of choices.");
    const allowed = new Set(question.options?.map((option) => option.value) ?? []);
    if (answer.some((value) => !allowed.has(value)))
      throw new Error("Answer contains an unknown choice.");
  }
  if (question.kind === "confirm" && typeof answer !== "boolean")
    throw new Error("Answer must be true or false.");
  if (question.kind === "text" && typeof answer !== "string")
    throw new Error("Answer must be text.");
  const validation = await question.validate?.(answer as never);
  if (validation) throw new Error(validation);
}
