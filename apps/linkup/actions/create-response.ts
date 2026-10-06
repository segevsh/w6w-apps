import type { ActionDefinition } from "@w6w/types";
import { compact, LinkupClient } from "../lib/client.ts";
import { jsonValue } from "../lib/params.ts";

interface Input {
  input: unknown;
  model: string;
  instructions?: string;
  format?: unknown;
}

const createResponse: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-response",
  type: "perform",
  idempotent: false,
  resource: "responses",
  title: "Create Response (OpenAI-compatible)",
  description:
    "Linkup's proxy of the OpenAI Responses API: a web-grounded answer from `linkup-standard` " +
    "(faster) or `linkup-deep` (more thorough).",
  params: [
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint:
        'A question as plain text, or a JSON array of {"role": user|assistant|developer, "content"} messages.',
    },
    {
      key: "model",
      label: "Model",
      type: "select",
      required: true,
      default: "linkup-standard",
      options: [
        { value: "linkup-standard", label: "linkup-standard (faster)" },
        { value: "linkup-deep", label: "linkup-deep (more comprehensive)" },
      ],
    },
    {
      key: "instructions",
      label: "Instructions",
      type: "text",
      hint: "Similar to a system message.",
    },
    {
      key: "format",
      label: "Text format",
      type: "json",
      hint: 'The literal "text", or a JSON Schema object for structured output.',
    },
  ],
  output: [
    { key: "outputText", type: "string", label: "The response text" },
    { key: "response", type: "object", label: "The full response object" },
  ],

  async execute(input, ctx) {
    if (!["linkup-standard", "linkup-deep"].includes(input.model)) {
      throw new Error("model must be linkup-standard or linkup-deep");
    }
    let text: unknown = input.input;
    if (typeof text === "string" && /^\s*[[{]/.test(text)) text = jsonValue(text, "Input");
    if (typeof text === "string" ? !text.trim() : !Array.isArray(text) || text.length < 1) {
      throw new Error("Input must be a question or a non-empty array of messages");
    }
    const format = typeof input.format === "string" && !/^\s*[[{]/.test(input.format)
      ? input.format.trim().replace(/^"|"$/g, "")
      : jsonValue(input.format, "Text format");
    const response = await new LinkupClient(ctx).post<Record<string, unknown>>(
      "/v1/responses",
      compact({
        input: text,
        model: input.model,
        instructions: input.instructions?.trim(),
        text: format ? { format } : undefined,
      }),
    );
    return { outputText: response?.output_text, response };
  },
};

export default createResponse;
