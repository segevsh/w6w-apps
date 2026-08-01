import type { ActionDefinition } from "@w6w/types";
import { CodaClient, toCells } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  rows: Array<Record<string, unknown>>;
  keyColumns?: string[];
  disableParsing?: boolean;
}

interface UpsertRowsResult {
  requestId: string;
  addedRowIds?: string[];
  updatedRowIds?: string[];
}

/**
 * POST /docs/{docId}/tables/{tableIdOrName}/rows
 *
 * Coda queues row writes for async processing and answers HTTP 202 with a
 * `requestId` rather than the finished result — pass it to `get-mutation-status`
 * to find out when it has actually applied. With `keyColumns` set this is an
 * upsert (match on those columns, update on hit); without it every call
 * inserts new rows, which is why this is NOT marked idempotent — retrying a
 * plain insert duplicates rows.
 */
const upsertRows: ActionDefinition<Input, UpsertRowsResult> = {
  key: "upsert-rows",
  type: "perform",
  resource: "row",
  title: "Insert / Upsert Rows",
  description:
    "Insert new rows, or upsert (match + update) when `keyColumns` is set. Queued — returns a `requestId`, not the finished rows.",
  idempotent: false,
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
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint:
        'Array of objects mapping column ID or name to cell value, e.g. `[{"c-abc123": "Done"}]`.',
    },
    {
      key: "keyColumns",
      label: "Key columns",
      type: "array",
      item: { type: "string" },
      hint: "Column IDs or names to match on for an upsert. Omit to always insert new rows.",
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
    { key: "addedRowIds", type: "array", label: "Added row IDs" },
    { key: "updatedRowIds", type: "array", label: "Updated row IDs" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<UpsertRowsResult>(
      `/docs/${input.docId}/tables/${input.tableId}/rows`,
      {
        method: "POST",
        query: { disableParsing: input.disableParsing },
        body: {
          rows: input.rows.map((row) => ({ cells: toCells(row) })),
          ...(input.keyColumns && input.keyColumns.length > 0
            ? { keyColumns: input.keyColumns }
            : {}),
        },
      },
    );
  },
};

export default upsertRows;
