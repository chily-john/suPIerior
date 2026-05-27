import { describe, expect, it } from "vitest";
import { QuestionQueue } from "../../../../extension-src/tui-tools/domains/questions/features/queue";
import type { QuestionDefinition } from "../../../../extension-src/tui-tools/domains/questions/shared/models/question-definition";

const questions: QuestionDefinition[] = [
  { id: "a", kind: "text", prompt: "A" },
  { id: "b", kind: "confirm", prompt: "B" },
];

describe("QuestionQueue", () => {
  it("tracks progress and adjustment indicators", () => {
    const queue = new QuestionQueue(questions, { phase: "Discovery" });
    queue.add({ id: "c", kind: "text", prompt: "C" });
    expect(queue.getProgress().statusText).toBe("[Feature: Discovery] Question 1 of 3 +1");
  });

  it("resolves answers and summaries", async () => {
    const queue = new QuestionQueue(questions, { phase: "Discovery" });
    await queue.resolveActive("answer");
    expect(queue.getAnswerRecords()[0]?.summary).toBe("A: answer");
    expect(queue.getProgress().currentIndex).toBe(2);
  });

  it("rebases queued questions without losing completed answers", async () => {
    const queue = new QuestionQueue(questions, { phase: "Discovery" });
    await queue.resolveActive("done");
    queue.rebase([
      { id: "a", kind: "text", prompt: "ignored" },
      { id: "c", kind: "text", prompt: "C" },
    ]);
    expect(queue.getSummary().queued).toHaveLength(0);
    expect(queue.active?.id).toBe("c");
  });

  it("reports adjustment as the delta between LLM question array lengths", () => {
    const queue = new QuestionQueue(questions, { phase: "Discovery" });
    queue.rebase([
      { id: "a", kind: "text", prompt: "A" },
      { id: "b", kind: "text", prompt: "B" },
      { id: "c", kind: "text", prompt: "C" },
      { id: "d", kind: "text", prompt: "D" },
    ]);
    expect(queue.getProgress().statusText).toBe("[Feature: Discovery] Question 1 of 4 +2");

    queue.rebase([{ id: "e", kind: "text", prompt: "E" }]);
    expect(queue.getProgress().statusText).toBe("[Feature: Discovery] Question 1 of 1 -3");
  });

  it("validates choice answers", async () => {
    const queue = new QuestionQueue(
      [{ id: "choice", kind: "choice", prompt: "Pick", options: [{ value: "yes" }] }],
      { phase: "Discovery" },
    );
    await expect(queue.resolveActive("no")).rejects.toThrow(/choices/);
  });
});
