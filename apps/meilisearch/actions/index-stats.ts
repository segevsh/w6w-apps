import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `GET /indexes/{indexUid}/stats` — verified against Meilisearch's OpenAPI
 * document (`get_index_stats`).
 *
 * `isIndexing` is the field a workflow actually wants: it says whether the
 * engine is still working through enqueued tasks for this index, which is the
 * closest thing to "are my documents searchable yet" without polling a specific
 * task.
 */
const action: ActionDefinition = {
  key: "index-stats",
  type: "read",
  resource: "index",
  title: "Get index stats",
  description: "Document count, whether the index is still indexing, and field distribution.",
  params: [INDEX_PARAM],
  output: [
    { key: "numberOfDocuments", type: "number", label: "Documents" },
    { key: "isIndexing", type: "boolean", label: "Still working through enqueued tasks" },
    { key: "fieldDistribution", type: "object", label: "How many documents have each field" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);

    ctx.log("info", "getting Meilisearch index stats", { index });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/stats`,
    );
  },
};

export default action;
