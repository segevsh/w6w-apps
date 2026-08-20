import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

interface Input {
  model: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  n?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  user?: string;
  responseFormat?: "text" | "json_object" | "json_schema";
  jsonSchema?: unknown;
  seed?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
}

/**
 * `messages` is required by the API but the harness passes it as an array via
 * `repeat: true` group in the future — for now callers supply a JSON array.
 * We forward it verbatim.
 */
const chatComplete: ActionDefinition<Input> = {
  key: "chat-complete",
  type: "perform",
  resource: "chat",
  title: "Create Chat Completion",
  description: "Generate a chat completion from a list of messages.",
  params: [
    { key: "model", label: "Model", type: "string", required: true, default: "gpt-4o-mini" },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: "Array of `{ role, content }` objects.",
    },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    { key: "n", label: "Number of completions", type: "number" },
    { key: "maxTokens", label: "Max tokens", type: "number" },
    { key: "frequencyPenalty", label: "Frequency penalty", type: "number" },
    { key: "presencePenalty", label: "Presence penalty", type: "number" },
    { key: "stop", label: "Stop", type: "string" },
    { key: "user", label: "User", type: "string" },
    {
      key: "responseFormat",
      label: "Response format",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "json_object", label: "JSON object" },
        { value: "json_schema", label: "JSON schema (structured outputs)" },
      ],
    },
    {
      key: "jsonSchema",
      label: "JSON schema",
      type: "json",
      showIf: { field: "responseFormat", equals: "json_schema" },
      hint:
        'The `json_schema` object OpenAI expects: `{ "name": "…", "schema": { … }, "strict": true }`. ' +
        "Structured outputs guarantee the reply parses against it.",
    },
    { key: "seed", label: "Seed", type: "number" },
    {
      // Tool calling is the feature that turns a completion into an agent step,
      // and it is the one thing this action could not do. Anthropic's
      // `message-create` in this same pack has carried `tools`/`tool_choice`
      // from the start; the shapes differ per vendor, so both stay `json`
      // rather than being modelled into a form.
      key: "tools",
      label: "Tools",
      type: "json",
      hint:
        'Array of tool definitions, e.g. [{ "type": "function", "function": { "name": "get_weather", "parameters": { … } } }]. ' +
        "The reply carries `choices[].message.tool_calls` when the model decides to call one.",
    },
    {
      key: "toolChoice",
      label: "Tool choice",
      type: "json",
      hint:
        '`"auto"`, `"none"`, `"required"`, or a specific tool: { "type": "function", "function": { "name": "…" } }',
    },
    {
      key: "parallelToolCalls",
      label: "Parallel tool calls",
      type: "boolean",
      hint: "Set false to make the model call at most one tool per turn.",
    },
  ],

  execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.topP !== undefined) body.top_p = input.topP;
    if (input.n !== undefined) body.n = input.n;
    if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
    if (input.frequencyPenalty !== undefined) body.frequency_penalty = input.frequencyPenalty;
    if (input.presencePenalty !== undefined) body.presence_penalty = input.presencePenalty;
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.user !== undefined) body.user = input.user;
    if (input.seed !== undefined) body.seed = input.seed;
    if (input.responseFormat) {
      // `json_schema` is the only format that carries a payload beside the type,
      // and OpenAI rejects the request when it is missing — better to say so
      // here than to forward a request that cannot succeed.
      if (input.responseFormat === "json_schema") {
        if (!input.jsonSchema) {
          throw new Error(
            'Response format "json_schema" requires a `jsonSchema` value — ' +
              "the `{ name, schema, strict }` object OpenAI expects.",
          );
        }
        body.response_format = { type: "json_schema", json_schema: input.jsonSchema };
      } else {
        body.response_format = { type: input.responseFormat };
      }
    }
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.toolChoice !== undefined) body.tool_choice = input.toolChoice;
    if (input.parallelToolCalls !== undefined) body.parallel_tool_calls = input.parallelToolCalls;

    return client.request("/chat/completions", { method: "POST", body });
  },
};

export default chatComplete;
