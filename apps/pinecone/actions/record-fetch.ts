import type { ActionDefinition } from "@w6w/types";
import { csv, PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS, NAMESPACE_PARAM } from "../lib/params.ts";

/**
 * `GET /vectors/fetch` on the index's own host — verified against Pinecone's
 * own `db_data` OpenAPI document (`fetch_vectors`).
 *
 * Lookup by id, not by similarity: the only way to get a record's values and
 * metadata back when you already know which record you want. A query with
 * `topK: 1` is not the same thing — it searches, this reads.
 *
 * Ids go in the **query string**, repeated (`?ids=a&ids=b`), which is what
 * makes this a `GET` with a list. Ids that do not exist are simply absent from
 * the response's `vectors` map rather than being an error, so comparing what
 * came back against what was asked for is how a workflow detects a missing
 * record.
 */
const action: ActionDefinition = {
  key: "record-fetch",
  type: "read",
  resource: "record",
  title: "Fetch records by ID",
  description:
    "Read records by id, with their values and metadata. Ids that do not exist are missing " +
    "from the response rather than an error.",
  params: [
    ...INDEX_PARAMS,
    NAMESPACE_PARAM,
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "doc-1,doc-2",
      hint: "Comma-separated. Sent as repeated `ids` query parameters.",
    },
  ],
  output: [
    { key: "vectors", type: "object", label: "Records by id" },
    { key: "namespace", type: "string", label: "Namespace" },
    { key: "usage", type: "object", label: "Usage (read units)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.ids);
    if (!ids) throw new Error("`ids` is required");

    return await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      "/vectors/fetch",
      { query: { ids, namespace: String(p.namespace ?? "") } },
    );
  },
};

export default action;
