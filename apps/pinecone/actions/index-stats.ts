import type { ActionDefinition } from "@w6w/types";
import { compact, json, PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS } from "../lib/params.ts";

/**
 * `POST /describe_index_stats` on the index's own host — verified against
 * Pinecone's own `db_data` OpenAPI document (`describe_index_stats`).
 *
 * How much is actually in the index, broken down **per namespace** — which is
 * the number that answers "did the ingest work", "is this namespace empty" and
 * "did the delete land". `index-get` describes the index's configuration; this
 * describes its contents, and the two live on different hosts.
 *
 * `indexFullness` is only meaningful for pod-based indexes; on serverless it
 * reads `0` regardless, because there is no fixed capacity to be a fraction of.
 * Reading it as "the index is empty" is a mistake the field name invites.
 *
 * The `filter` argument exists but is **pod-only**: Pinecone's own note says
 * serverless indexes do not support filtered stats. It is offered as an
 * advanced param and says so.
 */
const action: ActionDefinition = {
  key: "index-stats",
  type: "read",
  resource: "index",
  title: "Get index stats",
  description:
    "Record counts per namespace, and the index's dimension. The call that answers 'did the " +
    "ingest actually land'.",
  params: [
    ...INDEX_PARAMS,
    {
      key: "filter",
      label: "Metadata Filter",
      type: "json",
      default: "",
      advanced: true,
      hint: "Pod-based indexes only — serverless indexes ignore it. Counts only the records " +
        "matching.",
    },
  ],
  output: [
    { key: "namespaces", type: "object", label: "Per-namespace record counts" },
    { key: "dimension", type: "number", label: "Dimension" },
    { key: "indexFullness", type: "number", label: "Index fullness (pod-based only)" },
    { key: "totalVectorCount", type: "number", label: "Total records" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      "/describe_index_stats",
      { method: "POST", body: compact({ filter: json(p.filter, "filter") }) },
    );
  },
};

export default action;
