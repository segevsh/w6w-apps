import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient, parseJson } from "../lib/client.ts";

/**
 * `POST /v3/responses` - the OpenAI Responses API: stateful, so a follow-up turn passes
 * `previous_response_id` instead of resending the history. `stream` is never sent.
 */
interface Input {
  model: string;
  input?: unknown;
  instructions?: string;
  previousResponseId?: string;
  maxOutputTokens?: number;
  temperature?: number;
  store?: boolean;
  extraBody?: unknown;
}

interface ResponseBody {
  id?: string;
  status?: string;
  model?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: unknown;
  error?: unknown;
  cost?: number | null;
  provider?: string | null;
}

/** Concatenate the `output_text` parts of the message items. */
export function outputText(output: ResponseBody["output"]): string {
  const parts: string[] = [];
  for (const item of output ?? []) {
    if (item?.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
    }
  }
  return parts.join("");
}

const responseCreate: ActionDefinition<Input> = {
  key: "response-create",
  type: "perform",
  resource: "llm",
  title: "Create Response",
  description:
    "Create a model response with the stateful Responses API; continue a conversation by passing the previous response ID.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "openai/gpt-4o",
      hint: "provider/model, e.g. openai/gpt-4o.",
    },
    {
      key: "input",
      label: "Input",
      type: "text",
      hint: "A text prompt, or a JSON array of input items. Optional when continuing a response.",
    },
    { key: "instructions", label: "Instructions", type: "text" },
    { key: "previousResponseId", label: "Previous response ID", type: "string" },
    {
      key: "maxOutputTokens",
      label: "Max output tokens",
      type: "number",
      validation: { min: 1, integer: true },
    },
    { key: "temperature", label: "Temperature", type: "number", validation: { min: 0, max: 2 } },
    {
      key: "store",
      label: "Store response",
      type: "boolean",
      hint: "Let the provider keep it so it can be retrieved or continued.",
    },
    { key: "extraBody", label: "Extra body fields", type: "json" },
  ],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "text", type: "string", label: "Output text" },
    { key: "output", type: "array", label: "Output items" },
    { key: "model", type: "string", label: "Model" },
    { key: "usage", type: "object", label: "Token usage" },
    { key: "cost", type: "number", label: "Cost (USD)" },
    { key: "provider", type: "string", label: "Provider" },
  ],

  async execute(input, ctx) {
    const raw = typeof input.input === "string" ? input.input.trim() : input.input;
    // A string that parses as a JSON array is the item-list form; anything else is plain text.
    let inputValue: unknown = raw;
    if (typeof raw === "string" && raw.startsWith("[")) {
      try {
        inputValue = JSON.parse(raw);
      } catch { /* plain text that happens to start with a bracket */ }
    }
    if (!inputValue && !input.previousResponseId) {
      throw new Error("Provide Input, or a Previous response ID to continue");
    }
    const extra = parseJson<Record<string, unknown>>(input.extraBody, "Extra body fields") ?? {};
    const body = {
      ...extra,
      ...compact({
        model: input.model,
        input: inputValue,
        instructions: input.instructions,
        previous_response_id: input.previousResponseId,
        max_output_tokens: input.maxOutputTokens,
        temperature: input.temperature,
        store: input.store,
      }),
    };
    const res = await new EdenClient(ctx).json<ResponseBody>("/responses", {
      method: "POST",
      body,
    });
    return {
      id: res.id,
      status: res.status,
      text: outputText(res.output),
      output: res.output ?? [],
      model: res.model,
      usage: res.usage,
      cost: res.cost ?? undefined,
      provider: res.provider ?? undefined,
    };
  },
};

export default responseCreate;
