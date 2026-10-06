import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, XaiClient } from "../lib/client.ts";

interface Input {
  model: string;
  maxTokens: number;
  prompt?: string;
  messages?: unknown;
  system?: string;
  temperature?: number;
}

/** POST /v1/messages — the Anthropic-compatible endpoint. `max_tokens` is required there. */
const createMessage: ActionDefinition<Input> = {
  key: "create-message",
  type: "perform",
  resource: "message",
  title: "Create Message (Anthropic-compatible)",
  description: "Create a message through xAI's Anthropic-compatible endpoint (POST /v1/messages).",
  idempotent: false,
  params: [
    { key: "model", label: "Model", type: "string", required: true },
    { key: "maxTokens", label: "Max tokens", type: "number", required: true, default: 1024 },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      hint: "User message. Ignored if Messages is set.",
    },
    {
      key: "messages",
      label: "Messages (JSON)",
      type: "json",
      hint: 'e.g. [{"role":"user","content":"Hi"}].',
    },
    { key: "system", label: "System prompt", type: "text" },
    { key: "temperature", label: "Temperature", type: "number", validation: { min: 0, max: 2 } },
  ],
  output: [
    { key: "id", type: "string", label: "Message id" },
    { key: "content", type: "array", label: "Content blocks" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    let messages = parseJson("messages", input.messages);
    if (!messages) {
      if (!input.prompt) throw new Error("Provide either Messages or Prompt");
      messages = [{ role: "user", content: input.prompt }];
    }
    const body = compact({
      model: input.model,
      max_tokens: input.maxTokens,
      messages,
      system: input.system,
      temperature: input.temperature,
    });
    return new XaiClient(ctx).request("/v1/messages", { method: "POST", body });
  },
};

export default createMessage;
