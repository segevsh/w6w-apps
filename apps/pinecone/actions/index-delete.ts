import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";

/**
 * `DELETE /indexes/{index_name}` — verified against Pinecone's own `db_control`
 * OpenAPI document (`delete_index`).
 *
 * **This destroys every record in the index, and there is no undo.** Unlike a
 * namespace delete, which leaves the index and its configuration intact, this
 * takes the dimension, the metric, the embedding model and the host with it.
 * Rebuilding means re-embedding everything, which for a large corpus is a bill
 * as well as a wait.
 *
 * Pinecone offers one guard, and this app leans on it: an index with
 * **deletion protection enabled cannot be deleted** — the API answers `412`
 * until protection is turned off with `index-configure`. That is a deliberate
 * two-step, and this action does not do the first step for you.
 *
 * On top of it, a confirmation flag is required here, for the same reason
 * `documenso`'s envelope delete requires one: an irreversible call reached by a
 * mis-set variable should not succeed on the strength of a name alone.
 */
const action: ActionDefinition = {
  key: "index-delete",
  type: "perform",
  resource: "index",
  title: "Delete index",
  description:
    "Permanently delete an index and every record in it. Refused by Pinecone while deletion " +
    "protection is on, and refused here without an explicit confirmation.",
  idempotent: false,
  params: [
    {
      key: "indexName",
      label: "Index",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirm",
      label: "Yes, delete the index and everything in it",
      type: "boolean",
      required: true,
      default: false,
      hint: "There is no undo, and no export. Rebuilding means re-embedding the whole corpus.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Deleted" },
    { key: "indexName", type: "string", label: "Index" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    if (p.confirm !== true) {
      throw new Error(
        `refusing to delete index "${indexName}" without \`confirm\` — every record in it goes ` +
          "with it, and there is no undo",
      );
    }

    ctx.log("warn", "deleting Pinecone index", { indexName });
    await new PineconeClient(ctx).request(`/indexes/${encodeURIComponent(indexName)}`, {
      method: "DELETE",
    });
    return { ok: true, indexName };
  },
};

export default action;
