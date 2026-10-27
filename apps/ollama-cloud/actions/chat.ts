import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  format,
  json,
  modelOptions,
  OllamaCloudClient,
  requiredString,
  think,
  usage,
} from "../lib/client.ts";

/**
 * `POST /api/chat` — the next assistant message for a conversation, with
 * `stream: false`.
 *
 * ## The API keeps no conversation
 *
 * Ollama Cloud is stateless: every call must carry the whole history in `messages`,
 * oldest first, as `{role, content}` objects (`system`, `user`, `assistant`,
 * `tool`). A user message may carry `images` (raw base64) for a vision model.
 * Sending only the latest message gets an answer with no memory of the rest.
 *
 * ## Structured output
 *
 * `format` is blank, `json`, or a JSON Schema. `parsed` carries the decoded
 * message content when a format was set.
 */
const action: ActionDefinition = {
  key: "chat",
  type: "perform",
  resource: "generation",
  title: "Chat with a model",
  description: "Send a conversation (a messages array) to a model on Ollama Cloud and get the " +
    "assistant's reply as one result (non-streaming). Supports images, tools, JSON or " +
    "JSON-Schema structured output, and sampling options. Ollama keeps no history: send all " +
    "of it every time.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "llama3.2:3b",
      hint: "A model the account can call, `name:tag` — `model-list` shows them.",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      default: "",
      hint: 'Array of {"role": "system"|"user"|"assistant"|"tool", "content": "...", ' +
        '"images": ["<base64>"]} — oldest first, the whole conversation every call.',
    },
    {
      key: "format",
      label: "Output Format",
      type: "text",
      default: "",
      advanced: true,
      hint: "Blank for free text, `json` for any valid JSON, or a JSON Schema object.",
    },
    {
      key: "tools",
      label: "Tools",
      type: "json",
      default: "",
      advanced: true,
      hint: "Function definitions for a tool-capable model, in Ollama's tool format. Calls the " +
        "model wants made come back in `toolCalls`; this action does not run them.",
    },
    {
      key: "think",
      label: "Thinking",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Model default" },
        { value: "true", label: "On" },
        { value: "false", label: "Off" },
        { value: "low", label: "Low effort" },
        { value: "medium", label: "Medium effort" },
        { value: "high", label: "High effort" },
      ],
      hint: "For reasoning models. The reasoning is returned separately as `thinking`.",
    },
    { key: "temperature", label: "Temperature", type: "number", advanced: true },
    { key: "seed", label: "Seed", type: "number", advanced: true },
    {
      key: "numPredict",
      label: "Max Tokens",
      type: "number",
      advanced: true,
      hint: "Maximum tokens to generate (`num_predict`). -1 is unlimited.",
    },
    {
      key: "numCtx",
      label: "Context Window",
      type: "number",
      advanced: true,
      hint: "Tokens of context (`num_ctx`). A conversation longer than the window is " +
        "silently truncated by Ollama, not rejected.",
    },
    {
      key: "options",
      label: "Other Options",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Any other Ollama model option, e.g. {"top_k": 20}. The named options above win.',
    },
  ],
  output: [
    { key: "content", type: "string", label: "The assistant's reply text" },
    { key: "message", type: "object", label: "The full assistant message" },
    { key: "thinking", type: "string", label: "The model's reasoning, when thinking was on" },
    { key: "toolCalls", type: "array", label: "Tool calls the model asked for" },
    { key: "parsed", type: "object", label: "The reply decoded as JSON, when a format was set" },
    { key: "model", type: "string", label: "The model that answered" },
    { key: "doneReason", type: "string", label: "Why it stopped: stop, length, load, unload" },
    { key: "promptTokens", type: "number", label: "Tokens in the prompt" },
    { key: "completionTokens", type: "number", label: "Tokens generated" },
    { key: "totalSeconds", type: "number", label: "Total wall time" },
    { key: "loadSeconds", type: "number", label: "Time spent loading the model" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = requiredString(p.model, "model");
    const messages = json(p.messages, "messages");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("`messages` must be a non-empty array of {role, content} objects");
    }
    for (const [i, m] of messages.entries()) {
      const msg = m as { role?: unknown } | null;
      if (!msg || typeof msg !== "object" || typeof msg.role !== "string") {
        throw new Error(`\`messages[${i}]\` must be an object with a \`role\``);
      }
    }
    const fmt = format(p.format);
    const tools = json(p.tools, "tools");
    if (tools !== undefined && !Array.isArray(tools)) {
      throw new Error("`tools` must be an array of tool definitions");
    }

    const r = await new OllamaCloudClient(ctx).request<Record<string, unknown>>("/api/chat", {
      method: "POST",
      body: compact({
        model,
        messages,
        format: fmt,
        tools,
        think: think(p.think),
        options: modelOptions(p),
        stream: false,
      }),
    });

    const message = (r?.message ?? {}) as {
      content?: string;
      thinking?: string;
      tool_calls?: unknown[];
    };
    const content = String(message.content ?? "");
    let parsed: unknown;
    if (fmt !== undefined) {
      try {
        parsed = JSON.parse(content);
      } catch { /* a truncated structured reply is left as text */ }
    }
    return {
      content,
      message,
      thinking: message.thinking,
      toolCalls: message.tool_calls,
      parsed,
      model: r?.model,
      doneReason: r?.done_reason,
      ...usage(r),
    };
  },
};

export default action;
