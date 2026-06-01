import { describe, expect, it } from "vitest";
import {
  askQueue,
  type PiQuestionUi,
} from "../../../../extension-src/tui-tools/domains/questions/features/asking";
import { QuestionQueue } from "../../../../extension-src/tui-tools/domains/questions/features/queue";
import type { QuestionAnswer } from "../../../../extension-src/tui-tools/domains/questions/shared/models/question-definition";
import { createQuestionUiHarness } from "../../../support";

describe("askQueue", () => {
  it("keeps loading visible while async next-step work is pending", async () => {
    const harness = createQuestionUiHarness();
    const resolveActive = createDeferred<void>();
    const resolveStarted = createDeferred<QuestionAnswer>();
    class DeferredResolveQueue extends QuestionQueue {
      override async resolveActive(answer: QuestionAnswer) {
        resolveStarted.resolve(answer);
        await resolveActive.promise;
        return super.resolveActive(answer);
      }
    }
    const queue = new DeferredResolveQueue(
      [
        { id: "q1", kind: "text", prompt: "What should we build first?" },
        { id: "q2", kind: "text", prompt: "What should we build next?" },
      ],
      { phase: "Discovery" },
    );

    const answersPromise = askQueue(harness.ui, queue);
    expect(harness.screen(80)).toContain("What should we build first?");

    harness.ui.setEditorText?.("The loader gap test");
    expect(harness.enter()).toEqual({ consume: true });
    await expect(resolveStarted.promise).resolves.toBe("The loader gap test");

    expect(
      harness.timelineText(),
      "Expected working:indicator while async next-step work is still pending.\n" +
        harness.timelineText(),
    ).toContain("working:indicator");
    expect(
      harness.timelineText(),
      "Expected working:visible true while async next-step work is still pending.\n" +
        harness.timelineText(),
    ).toContain("working:visible true");
    expect(
      harness.screen(80),
      "Expected loading screen while async next-step work is still pending.\n" + harness.screen(80),
    ).toContain("Working:\nThinking…");

    resolveActive.resolve();
    await waitForMicrotasks();

    expect(harness.screen(80)).not.toContain("Working:");
    expect(harness.screen(80)).toContain("What should we build next?");

    harness.ui.setEditorText?.("The follow-up question");
    expect(harness.enter()).toEqual({ consume: true });
    await expect(answersPromise).resolves.toHaveLength(2);
  });

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

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

async function waitForMicrotasks(): Promise<void> {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}
