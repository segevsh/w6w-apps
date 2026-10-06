import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, XaiClient } from "../lib/client.ts";

interface Input {
  model: string;
  input: unknown;
  encodingFormat?: string;
  dimensions?: number;
}

/**
 * POST /v1/embeddings. `input` is sent as an array of strings, the shape the vendor's own
 * request example uses; a plain string is wrapped into a one-element array.
 */
const createEmbedding: ActionDefinition<Input> = {
  key: "create-embedding",
  type: "perform",
  resource: "embedding",
  title: "Create Embedding",
  description: "Create embedding vectors for text (POST /v1/embeddings).",
  idempotent: true,
  params: [
    { key: "model", label: "Embedding model", type: "string", required: true },
    {
      key: "input",
      label: "Input",
      type: "text",
      required: true,
      hint: "Text to embed, or a JSON array of strings (starts with `[`).",
    },
    {
      key: "encodingFormat",
      label: "Encoding format",
      type: "select",
      options: [{ value: "float", label: "float" }, { value: "base64", label: "base64" }],
    },
    { key: "dimensions", label: "Dimensions", type: "number" },
  ],
  output: [
    { key: "data", type: "array", label: "Embeddings" },
    { key: "model", type: "string", label: "Model" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const raw = input.input;
    const list = typeof raw === "string" && raw.trimStart().startsWith("[")
      ? parseJson("input", raw)
      : raw;
    const body = compact({
      model: input.model,
      input: Array.isArray(list) ? list : [list],
      encoding_format: input.encodingFormat,
      dimensions: input.dimensions,
    });
    return new XaiClient(ctx).request("/v1/embeddings", { method: "POST", body });
  },
};

export default createEmbedding;
