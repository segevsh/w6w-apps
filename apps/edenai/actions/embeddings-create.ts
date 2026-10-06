import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient, parseJson } from "../lib/client.ts";

/** `POST /v3/embeddings` - `input` is a string or a list of strings (max 2048 items for OpenAI). */
interface Input {
  model: string;
  input: unknown;
  dimensions?: number;
}

interface EmbeddingsBody {
  data?: Array<{ embedding?: number[] | string; index?: number }>;
  model?: string;
  usage?: unknown;
  cost?: number | null;
  provider?: string | null;
}

const embeddingsCreate: ActionDefinition<Input> = {
  key: "embeddings-create",
  type: "perform",
  resource: "llm",
  title: "Create Embeddings",
  description: "Turn text into embedding vectors for search, clustering or RAG.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "openai/text-embedding-3-small",
      hint: "provider/model. The current ids are listed at GET /v3/embeddings/models.",
    },
    {
      key: "input",
      label: "Input",
      type: "text",
      required: true,
      hint: "One text, or a JSON array of strings to embed several at once.",
    },
    {
      key: "dimensions",
      label: "Dimensions",
      type: "number",
      hint: "Shorter vectors. Supported by the text-embedding-3 series only.",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "embeddings", type: "array", label: "Vectors, one per input, in input order" },
    { key: "model", type: "string", label: "Model" },
    { key: "usage", type: "object", label: "Token usage" },
    { key: "cost", type: "number", label: "Cost (USD)" },
    { key: "provider", type: "string", label: "Provider" },
  ],

  async execute(input, ctx) {
    let value = input.input;
    if (typeof value === "string" && value.trim().startsWith("[")) {
      value = parseJson<string[]>(value, "Input") ?? value;
    }
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      throw new Error("Input is required");
    }
    const res = await new EdenClient(ctx).json<EmbeddingsBody>("/embeddings", {
      method: "POST",
      body: compact({ model: input.model, input: value, dimensions: input.dimensions }),
    });
    const ordered = [...(res.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return {
      embeddings: ordered.map((d) => d.embedding),
      model: res.model,
      usage: res.usage,
      cost: res.cost ?? undefined,
      provider: res.provider ?? undefined,
    };
  },
};

export default embeddingsCreate;
