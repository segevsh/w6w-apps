import type { ActionDefinition } from "@w6w/types";
import { CodaClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  rowIds: string[];
}

interface RowsDeleteResult {
  requestId: string;
}

/**
 * DELETE /docs/{docId}/tables/{tableIdOrName}/rows (bulk)
 *
 * Same queued contract as the single-row delete, batched. Idempotent for the
 * same reason: deleting rows that are already gone is a safe no-op.
 */
const deleteRows: ActionDefinition<Input, RowsDeleteResult> = {
  key: "delete-rows",
  type: "perform",
  resource: "row",
  title: "Delete Rows",
  description: "Delete multiple rows in one call. Queued — returns a `requestId`.",
  idempotent: true,
  params: [
    { key: "docId", label: "Doc ID", type: "string", required: true },
    {
      key: "tableId",
      label: "Table ID or name",
      type: "string",
      required: true,
      hint: "Table ID (preferred) or name.",
    },
    {
      key: "rowIds",
      label: "Row IDs",
      type: "array",
      item: { type: "string" },
      required: true,
      hint: "Row IDs to delete.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<RowsDeleteResult>(
      `/docs/${input.docId}/tables/${input.tableId}/rows`,
      { method: "DELETE", body: { rowIds: input.rowIds } },
    );
  },
};

export default deleteRows;
