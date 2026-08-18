import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient } from "../lib/client.ts";
import { INDEX_PARAM, TASK_OUTPUT } from "../lib/params.ts";

/**
 * `DELETE /indexes/{indexUid}/documents` — verified against Meilisearch's
 * OpenAPI document (`clear_all_documents`).
 *
 * **Empties the index.** The index itself survives with its settings and its
 * primary key; every document in it is gone, and Meilisearch has no undo and no
 * snapshot of it unless you made one.
 *
 * It is a separate action from `document-delete` rather than that action's
 * empty-filter case, so an unset filter field cannot empty an index. It also
 * requires an explicit confirmation on top of the index name.
 */
const action: ActionDefinition = {
  key: "documents-clear",
  type: "perform",
  resource: "document",
  title: "Clear all documents",
  description: "Enqueue deletion of every document in an index. The index and settings remain.",
  idempotent: true,
  params: [
    {
      ...INDEX_PARAM,
      required: true,
      hint: "Named explicitly — this action does not fall back to the connection's default.",
    },
    {
      key: "confirm",
      label: "I understand every document in this index will be deleted",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. There is no undo.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    // Deliberately not `resolveIndex` — a blank field must not resolve to the
    // connection's default and empty the wrong index.
    const index = String(p.indexUid ?? "").trim();
    if (!index) throw new Error("`indexUid` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — clearing an index cannot be undone");
    }

    ctx.log("warn", "enqueueing a Meilisearch index clear", { index });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/documents`,
      { method: "DELETE" },
    );
  },
};

export default action;
