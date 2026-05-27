import type { DiscoveryModelResponse, DiscoveryQuestion } from "@domain/model";

export class DiscoveryResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoveryResponseValidationError";
  }
}

export function parseDiscoveryModelResponse(output: string): DiscoveryModelResponse {
  const value = parseJsonObject(output);
  if (!isRecord(value))
    throw new DiscoveryResponseValidationError("Top-level value must be an object.");
  if (typeof value.readyToGenerate !== "boolean") {
    throw new DiscoveryResponseValidationError("readyToGenerate must be a boolean.");
  }
  if (!Array.isArray(value.questions)) {
    throw new DiscoveryResponseValidationError("questions must be an array.");
  }
  if ("message" in value && value.message !== undefined && typeof value.message !== "string") {
    throw new DiscoveryResponseValidationError("message must be a string when present.");
  }

  const questions: DiscoveryQuestion[] = value.questions.map((question, index) => {
    if (!isRecord(question)) {
      throw new DiscoveryResponseValidationError(`questions[${index}] must be an object.`);
    }
    if (typeof question.id !== "string" || !question.id.trim()) {
      throw new DiscoveryResponseValidationError(
        `questions[${index}].id must be a non-empty string.`,
      );
    }
    if (typeof question.text !== "string" || !question.text.trim()) {
      throw new DiscoveryResponseValidationError(
        `questions[${index}].text must be a non-empty string.`,
      );
    }
    return { id: question.id.trim(), text: question.text.trim() };
  });

  if (!value.readyToGenerate && questions.length === 0) {
    throw new DiscoveryResponseValidationError(
      "questions must include at least one question when readyToGenerate is false.",
    );
  }

  return {
    message:
      typeof value.message === "string" && value.message.trim() ? value.message.trim() : undefined,
    readyToGenerate: value.readyToGenerate,
    questions,
  };
}

function parseJsonObject(output: string): unknown {
  const trimmed = output.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1] ?? extractFirstJsonObject(trimmed) ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new DiscoveryResponseValidationError(
      `Model output was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function extractFirstJsonObject(text: string): string | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
