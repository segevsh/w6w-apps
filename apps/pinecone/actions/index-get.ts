import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";

/**
 * `GET /indexes/{index_name}` — verified against Pinecone's own `db_control`
 * OpenAPI document (`describe_index`).
 *
 * The call every data-plane action makes on your behalf, because its answer
 * carries the one thing a workflow cannot guess: **`host`**, the index's own
 * data-plane address. Read it once and pass it to the record actions as
 * **Index Host** and they stop making this call.
 *
 * `status.state` and `status.ready` are the other reason to call it. A freshly
 * created index answers control-plane calls while still `Initializing` and
 * rejects data-plane ones, so "created" and "usable" are different moments —
 * a workflow that creates an index and immediately upserts into it needs to
 * wait between the two.
 *
 * For an index with integrated embedding, `embed.field_map` names the field
 * whose text Pinecone will embed. `record-upsert-text` needs that name, and it
 * is set once at creation and never inferable from the data.
 */
const action: ActionDefinition = {
  key: "index-get",
  type: "read",
  resource: "index",
  title: "Get index",
  description:
    "One index in full — its data-plane host, dimension, metric, readiness and, for an " +
    "integrated-embedding index, the field map that says which field gets embedded.",
  params: [
    {
      key: "indexName",
      label: "Index",
      type: "string",
      required: true,
      default: "",
      placeholder: "product-embeddings",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "host", type: "string", label: "Data-plane host" },
    { key: "dimension", type: "number", label: "Dimension" },
    { key: "metric", type: "string", label: "Metric" },
    { key: "vector_type", type: "string", label: "Vector type" },
    { key: "deletion_protection", type: "string", label: "Deletion protection" },
    { key: "status", type: "object", label: "Status" },
    { key: "spec", type: "object", label: "Spec" },
    { key: "embed", type: "object", label: "Integrated embedding" },
  ],

  async execute(input, ctx) {
    const { indexName } = input as { indexName: string };
    if (!indexName) throw new Error("`indexName` is required");
    return await new PineconeClient(ctx).describeIndex(indexName);
  },
};

export default action;
