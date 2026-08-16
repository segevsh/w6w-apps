import type { ActionDefinition } from "@w6w/types";
import { PerplexityClient } from "../lib/client.ts";

interface Input {
  model: string;
  input: string | string[];
  dimensions?: number;
  encodingFormat?: "base64_int8" | "base64_binary";
}

/**
 * POST /v1/embeddings — text embeddings for semantic search, clustering, and
 * RAG. Verified against `https://docs.perplexity.ai/openapi.json`
 * (`EmbeddingsRequest` / `EmbeddingsResponse`, fetched 2026-08-16) and a live
 * unauthenticated probe: `POST /v1/embeddings` -> `401 application/json`,
 * same `invalid_api_key` shape as every other endpoint. Current product, not
 * part of the Sonar deprecation (see `chat-completion.ts`).
 *
 * ## There is no plain-float output
 *
 * Unlike OpenAI/Mistral embeddings, `embedding` in the response is always a
 * **base64 string**, never a JSON array of floats — `encoding_format` only
 * chooses what's packed inside it: `base64_int8` (signed int8 per dimension,
 * the default) or `base64_binary` (1 bit per dimension). A caller expecting
 * `response.data[].embedding` to already be `number[]` will decode nothing and
 * silently misuse the base64 text as if it were one. Downstream steps must
 * decode it themselves; this action returns the response as the API sent it.
 */
const createEmbeddings: ActionDefinition<Input> = {
  key: "create-embeddings",
  type: "perform",
  resource: "embedding",
  title: "Create Embeddings",
  description: "Generate embeddings for one or more input strings. The returned vectors are " +
    "base64-encoded, not plain float arrays — see the README.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "pplx-embed-v1-0.6b",
      hint: "pplx-embed-v1-0.6b or pplx-embed-v1-4b (published enum, may change).",
    },
    {
      key: "input",
      label: "Input",
      type: "string",
      required: true,
      repeat: true,
      hint: "One or more strings to embed. Max 512 texts; 32K tokens per text; 120K tokens total.",
    },
    {
      key: "dimensions",
      label: "Dimensions",
      type: "number",
      hint: "Matryoshka truncation. 128-1024 for the 0.6b model, 128-2560 for the 4b model. " +
        "Defaults to the model's full width.",
    },
    {
      key: "encodingFormat",
      label: "Encoding format",
      type: "select",
      options: [
        { value: "base64_int8", label: "Base64 int8 (default)" },
        { value: "base64_binary", label: "Base64 binary (1 bit/dimension)" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Embeddings" },
    { key: "model", type: "string", label: "Model" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new PerplexityClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      input: input.input,
    };
    if (input.dimensions !== undefined) body.dimensions = input.dimensions;
    if (input.encodingFormat) body.encoding_format = input.encodingFormat;

    return client.request("/v1/embeddings", { method: "POST", body });
  },
};

export default createEmbeddings;
