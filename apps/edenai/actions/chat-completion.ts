import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient, list, parseJson } from "../lib/client.ts";

/**
 * `POST /v3/chat/completions` - OpenAI-compatible chat.
 *
 * `model` is `provider/model` (`openai/gpt-4o`) or a bare model name, in which case Eden AI picks
 * the provider (`routing.sort` steers how). `stream` is never sent: this Action returns the whole
 * completion, so a streamed body would arrive as unusable SSE text.
 */
interface Input {
  model: string;
  prompt?: string;
  systemPrompt?: string;
  messages?: unknown;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: string;
  responseFormat?: unknown;
  fallbacks?: string;
  routingSort?: string;
  extraBody?: unknown;
}

interface Completion {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: unknown[] | null; refusal?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: unknown;
}

const chatCompletion: ActionDefinition<Input> = {
  key: "chat-completion",
  type: "perform",
  resource: "llm",
  title: "Chat Completion",
  description: "Send a prompt (or a full message list) to any LLM and get the model's reply.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "openai/gpt-4o",
      hint: "provider/model, e.g. openai/gpt-4o. A bare model name " +
        "lets Eden AI choose the provider. List them with List Models.",
    },
    { key: "prompt", label: "Prompt", type: "text", hint: "Sent as one user message." },
    { key: "systemPrompt", label: "System prompt", type: "text" },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      hint: 'Full conversation as [{"role":"user","content":"..."}]. Overrides Prompt and ' +
        "System prompt when set.",
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      validation: { min: 0, max: 2 },
    },
    {
      key: "maxTokens",
      label: "Max tokens",
      type: "number",
      validation: { min: 1, integer: true },
    },
    {
      key: "reasoningEffort",
      label: "Reasoning effort",
      type: "select",
      options: ["minimal", "low", "medium", "high", "max", "xhigh", "disable", "none"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "responseFormat",
      label: "Response format",
      type: "json",
      hint: 'e.g. {"type":"json_object"} or a json_schema format. See the Structured Output guide.',
    },
    {
      key: "fallbacks",
      label: "Fallback models",
      type: "string",
      hint: "Comma-separated model ids tried in order if the primary model fails.",
    },
    {
      key: "routingSort",
      label: "Provider routing",
      type: "select",
      hint: "Only for a bare model name: how to choose among providers.",
      options: [
        { value: "cost", label: "Cheapest" },
        { value: "speed", label: "Fastest tokens/second" },
        { value: "latency", label: "Lowest latency" },
        { value: "exact", label: "Most reliable tool calls" },
      ],
    },
    {
      key: "extraBody",
      label: "Extra body fields",
      type: "json",
      hint: "Any other request field (top_p, tools, seed, ...), merged into the request body.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "Reply text" },
    { key: "finishReason", type: "string", label: "Finish reason" },
    { key: "model", type: "string", label: "Model that answered" },
    { key: "id", type: "string", label: "Completion ID" },
    { key: "toolCalls", type: "array", label: "Tool calls" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  async execute(input, ctx) {
    let messages = parseJson<unknown[]>(input.messages, "Messages");
    if (!messages) {
      if (!input.prompt) throw new Error("Provide a Prompt or Messages");
      messages = [
        ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
        { role: "user", content: input.prompt },
      ];
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages must be a non-empty JSON array");
    }
    const extra = parseJson<Record<string, unknown>>(input.extraBody, "Extra body fields") ?? {};
    const body = {
      ...extra,
      ...compact({
        model: input.model,
        messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
        reasoning_effort: input.reasoningEffort,
        response_format: parseJson(input.responseFormat, "Response format"),
        fallbacks: list(input.fallbacks),
        routing: input.routingSort ? { sort: input.routingSort } : undefined,
      }),
    };
    const res = await new EdenClient(ctx).json<Completion>("/chat/completions", {
      method: "POST",
      body,
    });
    const choice = res.choices?.[0];
    return {
      content: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason ?? undefined,
      model: res.model,
      id: res.id,
      toolCalls: choice?.message?.tool_calls ?? [],
      usage: res.usage,
    };
  },
};

export default chatCompletion;
