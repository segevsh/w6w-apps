import type { ActionDefinition } from "@w6w/types";
import { CodaClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  rowId: string;
}

interface RowDeleteResult {
  requestId: string;
}

/**
 * DELETE /docs/{docId}/tables/{tableIdOrName}/rows/{rowIdOrName}
 *
 * Queued like the other writes — 202 + `requestId`. Deleting an
 * already-deleted (or never-existed) row is a safe no-op to retry, so this is
 * idempotent.
 */
const deleteRow: ActionDefinition<Input, RowDeleteResult> = {
  key: "delete-row",
  type: "perform",
  resource: "row",
  title: "Delete Row",
  description: "Delete a single row. Queued — returns a `requestId`.",
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
      key: "rowId",
      label: "Row ID or name",
      type: "string",
      required: true,
      hint: "Row ID (preferred) or name; URI-encode names.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<RowDeleteResult>(
      `/docs/${input.docId}/tables/${input.tableId}/rows/${input.rowId}`,
      { method: "DELETE" },
    );
  },
};

export default deleteRow;
