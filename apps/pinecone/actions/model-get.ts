import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";

/**
 * `GET /models/{model_name}` — verified against Pinecone's own `inference`
 * OpenAPI document (`get_model`).
 *
 * One model in detail, which is where the parameters that matter are actually
 * documented: the supported `input_type` values, the truncation options, the
 * maximum batch size, the sequence length, and — for an embedding model — the
 * **dimension** an index must be created with to hold its output.
 *
 * That last one is the usual reason to call this: `index-create` needs a
 * dimension, getting it wrong is unfixable without a re-ingest, and this is the
 * authoritative source for it.
 */
const action: ActionDefinition = {
  key: "model-get",
  type: "read",
  resource: "model",
  title: "Get model",
  description:
    "One model's details — dimension, supported parameters, batch and sequence limits. The " +
    "authoritative source for the dimension an index needs.",
  params: [
    {
      key: "modelName",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "multilingual-e5-large",
    },
  ],
  output: [
    { key: "model", type: "string", label: "Model" },
    { key: "type", type: "string", label: "Type" },
    { key: "vector_type", type: "string", label: "Vector type" },
    { key: "default_dimension", type: "number", label: "Default dimension" },
    { key: "supported_parameters", type: "array", label: "Supported parameters" },
    { key: "max_batch_size", type: "number", label: "Max batch size" },
  ],

  async execute(input, ctx) {
    const { modelName } = input as { modelName: string };
    if (!modelName) throw new Error("`modelName` is required");
    return await new PineconeClient(ctx).request(`/models/${encodeURIComponent(modelName)}`);
  },
};

export default action;
