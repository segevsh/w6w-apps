import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";

/**
 * `GET /models` — verified against Pinecone's own `inference` OpenAPI document
 * (`list_models`).
 *
 * What this project can actually call, which is not a constant: models are
 * added and retired, and availability varies. Every other action that names a
 * model — `embed`, `rerank`, `index-create-for-model`, `record-search`'s
 * reranker — takes a name that has to come from here.
 *
 * The `type` filter separates the two kinds, and they are not interchangeable:
 * an `embed` model turns text into vectors, a `rerank` model scores a
 * query-document pair and cannot produce a vector at all. Each model's entry
 * also carries its **dimension** and `vector_type`, which is what
 * `index-create` needs to be told and cannot infer.
 */
const action: ActionDefinition = {
  key: "model-list",
  type: "read",
  resource: "model",
  title: "List models",
  description:
    "The embedding and reranking models available to this project, with the dimension each " +
    "produces — the number an index has to be created with.",
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All" },
        { value: "embed", label: "Embedding models" },
        { value: "rerank", label: "Reranking models" },
      ],
    },
    {
      key: "vectorType",
      label: "Vector Type",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "All" },
        { value: "dense", label: "Dense" },
        { value: "sparse", label: "Sparse" },
      ],
      hint: "Embedding models only.",
    },
  ],
  output: [
    { key: "models", type: "array", label: "Models" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new PineconeClient(ctx).request("/models", {
      // The request builder already drops empty and undefined values.
      query: {
        type: String(p.type ?? "") || undefined,
        vector_type: String(p.vectorType ?? "") || undefined,
      },
    });
  },
};

export default action;
