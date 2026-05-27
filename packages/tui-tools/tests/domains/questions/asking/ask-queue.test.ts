import { describe, expect, it } from "vitest";
import {
  askQueue,
  type PiQuestionUi,
} from "../../../../extension-src/tui-tools/domains/questions/features/asking";
import { QuestionQueue } from "../../../../extension-src/tui-tools/domains/questions/features/queue";

describe("askQueue", () => {
  it("sets status only while asking", async () => {
    const statuses: Array<string | undefined> = [];
    const ui: PiQuestionUi = {
      input: async () => "value",
      select: async () => undefined,
      confirm: async () => true,
      setStatus: (_key, value) => statuses.push(value),
    };
    const queue = new QuestionQueue([{ id: "a", kind: "text", prompt: "A" }], {
      phase: "Discovery",
    });
    await askQueue(ui, queue);
    expect(statuses[0]).toContain("Question 1 of 1");
    expect(statuses.at(-1)).toBeUndefined();
  });
});
