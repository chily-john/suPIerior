export type QuestionKind = "text" | "choice" | "multi-choice" | "confirm";

export interface ChoiceOption {
  value: string;
  label?: string;
  helpText?: string;
}

export type QuestionAnswer = string | string[] | boolean;

export interface QuestionDefinition<TAnswer extends QuestionAnswer = QuestionAnswer> {
  id: string;
  kind: QuestionKind;
  prompt: string;
  helpText?: string;
  options?: ChoiceOption[];
  defaultValue?: TAnswer;
  recordInContext?: boolean;
  validate?: (answer: TAnswer) => string | undefined | Promise<string | undefined>;
  summarize?: (answer: TAnswer, question: QuestionDefinition<TAnswer>) => string;
}
