import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, XaiClient } from "../lib/client.ts";

interface Input {
  model: string;
  prompt?: string;
  system?: string;
  messages?: unknown;
  temperature?: number;
  topP?: number;
  maxCompletionTokens?: number;
  reasoningEffort?: string;
  seed?: number;
  responseFormat?: unknown;
  tools?: unknown;
}

/**
 * POST /v1/chat/completions. `prompt` (+ optional `system`) is the shortcut for a one-turn
 * call; `messages` (a JSON array) overrides both for multi-turn or image input.
 */
const chatComplete: ActionDefinition<Input> = {
  key: "chat-complete",
  type: "perform",
  resource: "chat",
  title: "Chat Completion",
  description: "Create a Grok chat completion (POST /v1/chat/completions).",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      hint: "A model id from List Models, e.g. a grok-* model.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      hint: "User message. Ignored if Messages is set.",
    },
    { key: "system", label: "System prompt", type: "text" },
    {
      key: "messages",
      label: "Messages (JSON)",
      type: "json",
      hint: 'Full conversation, e.g. [{"role":"user","content":"Hi"}]. Overrides Prompt/System.',
    },
    { key: "temperature", label: "Temperature", type: "number", validation: { min: 0, max: 2 } },
    { key: "topP", label: "Top P", type: "number" },
    { key: "maxCompletionTokens", label: "Max completion tokens", type: "number" },
    {
      key: "reasoningEffort",
      label: "Reasoning effort",
      type: "string",
      hint: "Only for reasoning models; supported values and default depend on the model.",
    },
    { key: "seed", label: "Seed", type: "number" },
    {
      key: "responseFormat",
      label: "Response format (JSON)",
      type: "json",
      hint: 'e.g. {"type":"json_object"}.',
    },
    { key: "tools", label: "Tools (JSON)", type: "json", hint: "Function tool definitions." },
  ],
  output: [
    { key: "id", type: "string", label: "Completion id" },
    { key: "model", type: "string", label: "Model" },
    { key: "choices", type: "array", label: "Choices" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    let messages = parseJson("messages", input.messages);
    if (!messages) {
      if (!input.prompt) throw new Error("Provide either Messages or Prompt");
      messages = [
        ...(input.system ? [{ role: "system", content: input.system }] : []),
        { role: "user", content: input.prompt },
      ];
    }
    const body = compact({
      model: input.model,
      messages,
      temperature: input.temperature,
      top_p: input.topP,
      max_completion_tokens: input.maxCompletionTokens,
      reasoning_effort: input.reasoningEffort,
      seed: input.seed,
      response_format: parseJson("responseFormat", input.responseFormat),
      tools: parseJson("tools", input.tools),
    });
    return new XaiClient(ctx).request("/v1/chat/completions", { method: "POST", body });
  },
};

export default chatComplete;
