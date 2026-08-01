import type { ActionDefinition } from "@w6w/types";
import { CodaClient, toCells } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  rowId: string;
  row: Record<string, unknown>;
  disableParsing?: boolean;
}

interface RowUpdateResult {
  requestId: string;
  id: string;
}

/**
 * PUT /docs/{docId}/tables/{tableIdOrName}/rows/{rowIdOrName}
 *
 * Also queued — 202 + `requestId`, same as the write endpoints. Marked
 * idempotent: applying the same cell values to the same row twice converges
 * on the same end state, unlike a plain insert.
 */
const updateRow: ActionDefinition<Input, RowUpdateResult> = {
  key: "update-row",
  type: "perform",
  resource: "row",
  title: "Update Row",
  description:
    "Update cells on an existing row. Queued — returns a `requestId`, not the finished row.",
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
    {
      key: "row",
      label: "Cell values",
      type: "json",
      required: true,
      hint: 'Object mapping column ID or name to the new cell value, e.g. `{"c-abc123": "Done"}`.',
    },
    {
      key: "disableParsing",
      label: "Disable value parsing",
      type: "boolean",
      default: false,
      hint: "Skip Coda's automatic parsing of cell values (dates, links, etc.).",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Request ID" },
    { key: "id", type: "string", label: "Row ID" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<RowUpdateResult>(
      `/docs/${input.docId}/tables/${input.tableId}/rows/${input.rowId}`,
      {
        method: "PUT",
        query: { disableParsing: input.disableParsing },
        body: { row: { cells: toCells(input.row) } },
      },
    );
  },
};

export default updateRow;
