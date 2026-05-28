import * as fs from "node:fs";

export type MaintainerOutputEvent =
  | { kind: "log"; text: string }
  | { kind: "complete"; source: "final_message" | "agent_end" };

export function parseMaintainerOutputLine(
  line: string,
  logPath: string,
): MaintainerOutputEvent | undefined {
  if (!line.trim()) return undefined;
  try {
    const event = JSON.parse(line) as {
      type?: string;
      message?: {
        role?: string;
        stopReason?: string;
        content?: Array<{ type?: string; text?: string }>;
      };
    };
    if (
      event.type === "message_end" &&
      event.message?.role === "assistant" &&
      event.message.content
    ) {
      const text = event.message.content
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n")
        .trim();
      if (text) fs.appendFileSync(logPath, `${text}\n`);
      const hasToolCalls = event.message.content.some(
        (part) => part.type === "toolCall" || part.type === "tool_call",
      );
      const stoppedWithError =
        event.message.stopReason === "error" || event.message.stopReason === "aborted";
      if (!hasToolCalls && !stoppedWithError) return { kind: "complete", source: "final_message" };
    }
    if (event.type === "agent_end") return { kind: "complete", source: "agent_end" };
  } catch {
    fs.appendFileSync(logPath, `${line}\n`);
  }
  return undefined;
}
