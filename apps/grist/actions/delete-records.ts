import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  rowIds: number[];
}

/**
 * `POST /docs/{docId}/tables/{tableId}/records/delete`.
 *
 * Two things are unusual and both are the API's doing, not this action's:
 *
 *  - It is a **POST to a `/delete` sub-path**, not `DELETE` on the collection.
 *    Grist needs a body, and a request body on `DELETE` is not portable.
 *  - The body is a **bare JSON array** of row ids — `[101, 102]` — with no
 *    `{"records": …}` envelope, unlike every other write on this table.
 */
const deleteRecords: ActionDefinition<Input, { deleted: number[] }> = {
  key: "delete-records",
  type: "perform",
  resource: "record",
  title: "Delete Records",
  description: "Delete records by row ID. Not recoverable through the API.",
  // Deleting an already-deleted row converges on the same state.
  idempotent: true,
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    { key: "tableId", label: "Table ID", type: "string", required: true },
    {
      key: "rowIds",
      label: "Row IDs",
      type: "array",
      required: true,
      item: { type: "number" },
      hint: "Numeric row IDs, as returned by `list-records`.",
    },
  ],
  output: [
    { key: "deleted", type: "array", label: "Row IDs submitted for deletion" },
  ],

  async execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    const rowIds = input.rowIds ?? [];
    await client.request(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/records/delete`,
      // Bare array body — no envelope. See the note above.
      { method: "POST", body: rowIds },
    );
    // Grist returns nothing; echo what was asked for so the step has output.
    return { deleted: rowIds };
  },
};

export default deleteRecords;
