import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient } from "../lib/client.ts";

/**
 * `GET /stats` — verified against Meilisearch's OpenAPI document
 * (`get_stats`).
 *
 * Instance-wide rather than per-index: total database size on disk, and a
 * per-index breakdown of document counts and indexing state. `databaseSize` is
 * the number that matters on Cloud, where the plan is sized by it.
 */
const action: ActionDefinition = {
  key: "stats-get",
  type: "read",
  resource: "instance",
  title: "Get instance stats",
  description: "Database size on disk and per-index document counts.",
  params: [],
  output: [
    { key: "databaseSize", type: "number", label: "Database size in bytes" },
    { key: "usedDatabaseSize", type: "number", label: "Used size in bytes" },
    { key: "lastUpdate", type: "string", label: "Last update" },
    { key: "indexes", type: "object", label: "Per-index counts and indexing state" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting Meilisearch instance stats", {});
    return await new MeilisearchClient(ctx).request("/stats");
  },
};

export default action;
