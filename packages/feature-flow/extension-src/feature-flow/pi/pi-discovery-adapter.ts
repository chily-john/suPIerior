import {
  completeSimple,
  type Api,
  type Model,
  type ModelThinkingLevel,
  type ThinkingLevel,
} from "@mariozechner/pi-ai";
import type { ModelRegistry } from "@mariozechner/pi-coding-agent";
import type {
  DiscoveryModelAdapter,
  DiscoveryModelRequestOptions,
} from "@domain/discovery/adapter";

export class PiDiscoveryModelAdapter implements DiscoveryModelAdapter {
  constructor(
    private readonly model: Model<Api>,
    private readonly modelRegistry: ModelRegistry,
    private readonly thinkingLevel: ModelThinkingLevel,
    private readonly systemPrompt: string,
  ) {}

  async complete(prompt: string, options: DiscoveryModelRequestOptions = {}): Promise<string> {
    const auth = await this.modelRegistry.getApiKeyAndHeaders(this.model);
    if (!auth.ok) {
      throw new Error(`Feature-flow could not use Pi model auth: ${auth.error}`);
    }

    const message = await completeSimple(
      this.model,
      {
        systemPrompt: this.systemPrompt,
        messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
      },
      {
        apiKey: auth.apiKey,
        headers: auth.headers,
        signal: options.signal,
        reasoning: toReasoningLevel(this.thinkingLevel),
      },
    );

    if (message.stopReason === "error" || message.stopReason === "aborted") {
      throw new Error(
        message.errorMessage ?? `Pi model request failed with stop reason '${message.stopReason}'.`,
      );
    }

    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();

    if (!text) {
      const contentTypes = message.content.map((part) => part.type).join(", ") || "none";
      throw new Error(
        `Pi model response did not include text content. stopReason=${message.stopReason}; contentTypes=${contentTypes}.`,
      );
    }
    return text;
  }
}

function toReasoningLevel(level: ModelThinkingLevel): ThinkingLevel | undefined {
  return level === "off" ? undefined : level;
}
