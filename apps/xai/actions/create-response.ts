import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, XaiClient } from "../lib/client.ts";

interface Input {
  model: string;
  input: unknown;
  instructions?: string;
  previousResponseId?: string;
  store?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  reasoningEffort?: string;
  tools?: unknown;
}

/** POST /v1/responses. `input` is a string or a JSON array of input items. */
const createResponse: ActionDefinition<Input> = {
  key: "create-response",
  type: "perform",
  resource: "response",
  title: "Create Response",
  description: "Create a response with the Responses API (POST /v1/responses).",
  idempotent: false,
  params: [
    { key: "model", label: "Model", type: "string", required: true },
    {
      key: "input",
      label: "Input",
      type: "text",
      required: true,
      hint: "Text, or a JSON array of input items (starts with `[`).",
    },
    { key: "instructions", label: "Instructions", type: "text", hint: "System prompt." },
    {
      key: "previousResponseId",
      label: "Previous response ID",
      type: "string",
      hint: "Continue a stored conversation without resending history.",
    },
    {
      key: "store",
      label: "Store response",
      type: "boolean",
      hint: "Stored responses are kept 30 days, then permanently deleted.",
    },
    { key: "temperature", label: "Temperature", type: "number", validation: { min: 0, max: 2 } },
    { key: "maxOutputTokens", label: "Max output tokens", type: "number" },
    { key: "reasoningEffort", label: "Reasoning effort", type: "string" },
    { key: "tools", label: "Tools (JSON)", type: "json" },
  ],
  output: [
    { key: "id", type: "string", label: "Response id" },
    { key: "output", type: "array", label: "Output items" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const raw = input.input;
    const parsed = typeof raw === "string" && raw.trimStart().startsWith("[")
      ? parseJson("input", raw)
      : raw;
    const body = compact({
      model: input.model,
      input: parsed,
      instructions: input.instructions,
      previous_response_id: input.previousResponseId,
      store: input.store,
      temperature: input.temperature,
      max_output_tokens: input.maxOutputTokens,
      reasoning_effort: input.reasoningEffort,
      tools: parseJson("tools", input.tools),
    });
    return new XaiClient(ctx).request("/v1/responses", { method: "POST", body });
  },
};

export default createResponse;
