import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient } from "../lib/client.ts";
import { INDEX_PARAM, TASK_OUTPUT } from "../lib/params.ts";

/**
 * `DELETE /indexes/{indexUid}` — verified against Meilisearch's OpenAPI
 * document (`delete_index`).
 *
 * **Deletes the index, its documents and its settings.** Everything: the
 * searchable attributes, the filterable attributes, the synonyms, the
 * embedders. Rebuilding means re-applying all of it and re-indexing every
 * document, so this is the most expensive mistake available in this app.
 *
 * The index is deliberately **not** defaulted from the connection — a blank
 * field here would otherwise delete the connection's main index — and an
 * explicit confirmation is required on top of the name.
 */
const action: ActionDefinition = {
  key: "index-delete",
  type: "perform",
  resource: "index",
  title: "Delete an index",
  description: "Enqueue deletion of an index, its documents and all of its settings.",
  idempotent: true,
  params: [
    {
      ...INDEX_PARAM,
      required: true,
      hint: "Named explicitly — this action does not fall back to the connection's default.",
    },
    {
      key: "confirm",
      label: "I understand the documents and settings go with it",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Rebuilding means re-applying every setting and re-indexing everything.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = String(p.indexUid ?? "").trim();
    if (!index) throw new Error("`indexUid` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting an index takes its settings too");
    }

    ctx.log("warn", "enqueueing a Meilisearch index deletion", { index });

    return await new MeilisearchClient(ctx).request(`/indexes/${encodeURIComponent(index)}`, {
      method: "DELETE",
    });
  },
};

export default action;
