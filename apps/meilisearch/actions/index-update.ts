import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM, TASK_OUTPUT } from "../lib/params.ts";

/**
 * `PATCH /indexes/{indexUid}` — verified against Meilisearch's OpenAPI document
 * (`update_index`).
 *
 * The only thing this changes is the primary key, and **it only works while the
 * index is empty**. Once documents exist the task fails with
 * `index_primary_key_already_exists`. That is a task failure, not an HTTP
 * error, so the call itself still looks like it worked — which is the whole
 * reason `task-get` matters.
 */
const action: ActionDefinition = {
  key: "index-update",
  type: "perform",
  resource: "index",
  title: "Set an index's primary key",
  description: "Enqueue a primary key change. Only succeeds while the index is empty.",
  idempotent: true,
  params: [
    INDEX_PARAM,
    {
      key: "primaryKey",
      label: "Primary Key",
      type: "string",
      required: true,
      default: "",
      hint: "The task FAILS if the index already holds documents — check it with Get Task.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);
    const primaryKey = String(p.primaryKey ?? "").trim();
    if (!primaryKey) throw new Error("`primaryKey` is required");

    ctx.log("info", "enqueueing a Meilisearch primary key change", { index, primaryKey });

    return await new MeilisearchClient(ctx).request(`/indexes/${encodeURIComponent(index)}`, {
      method: "PATCH",
      body: { primaryKey },
    });
  },
};

export default action;
