import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  colId: string;
}

/**
 * `DELETE /docs/{docId}/tables/{tableId}/columns/{colId}`.
 *
 * The one destructive schema call in this app, and the only column endpoint that
 * is a real `DELETE`. `colId` is the id "without the starting `$`" — Grist shows
 * formulas as `$popularity`, and pasting that in is the obvious mistake, so the
 * hint says so.
 *
 * Deleting a column deletes its data with it, and any formula referring to it
 * starts erroring. There is no undo through the API — only the document's own
 * history in the UI.
 */
const deleteColumn: ActionDefinition<Input, { deleted: string }> = {
  key: "delete-column",
  type: "perform",
  resource: "column",
  title: "Delete Column",
  description: "Delete a column from a table, along with all of its data.",
  // Re-deleting a gone column 404s rather than mutating anything further.
  idempotent: true,
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    { key: "tableId", label: "Table ID", type: "string", required: true },
    {
      key: "colId",
      label: "Column ID",
      type: "string",
      required: true,
      hint: "The column ID WITHOUT a leading `$` — `popularity`, not `$popularity`.",
    },
  ],
  output: [
    { key: "deleted", type: "string", label: "Column ID deleted" },
  ],

  async execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    await client.request(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/columns/${encodeURIComponent(input.colId)}`,
      { method: "DELETE" },
    );
    return { deleted: input.colId };
  },
};

export default deleteColumn;
