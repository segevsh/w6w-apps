import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  GraphClient,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { sessionIdParam, workbookParams } from "../lib/params.ts";

interface Input extends WorkbookRef {
  table: string;
  values: unknown;
  index?: number;
  worksheet?: string;
  sessionId?: string;
}

interface TableRow {
  index?: number;
  values?: unknown[][];
}

/**
 * `POST …/workbook/tables/{id|name}/rows/add`
 * `POST …/workbook/worksheets/{id|name}/tables/{id|name}/rows/add`
 *
 * https://learn.microsoft.com/en-us/graph/api/tablerowcollection-add
 *
 * The append primitive, and the one place Microsoft gives explicit batching
 * advice: "Adding one row at a time could lead to performance degradation. The
 * recommended approach would be to batch the rows together in a single call
 * rather than doing single row insertion." Hence `values` is a two-dimensional
 * array of *rows*, and appending a hundred of them is one call.
 *
 * `index` is optional and zero-based; omit it (the default) and rows go to the
 * end, which is what "append" means here. Supplying one inserts at that position
 * and shifts the rows below downwards.
 *
 * Not idempotent, and this is the action where that bites hardest: a retry after
 * a timeout appends the same rows twice. Graph exposes no client-supplied
 * dedupe key on this endpoint — the reference does note the request "might
 * occasionally receive a 504 HTTP error" and that the response is to repeat it,
 * so a duplicate-tolerant downstream or a de-duplicating read is the honest
 * mitigation. Success is `200 OK`, not `201`.
 */
const addTableRows: ActionDefinition<Input, TableRow> = {
  key: "add-table-rows",
  type: "perform",
  resource: "table",
  title: "Add Table Rows",
  description:
    "Append one or more rows to an Excel table. Batch them into a single call — Microsoft's own guidance.",
  idempotent: false,
  params: [
    ...workbookParams(),
    {
      key: "table",
      label: "Table",
      type: "string",
      required: true,
      placeholder: "Table1",
      hint: "Table name or id. See List Tables.",
    },
    {
      key: "values",
      label: "Rows",
      type: "json",
      required: true,
      placeholder: '[["2026-08-01",49,37],["2026-08-02",51,38]]',
      hint:
        "Two-dimensional array — an array of rows, each an array of cell values. One call per batch, not one call per row.",
    },
    {
      key: "index",
      label: "Insert at index",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint:
        "Zero-based position to insert at, shifting rows below downwards. Leave empty to append at the end.",
    },
    {
      key: "worksheet",
      label: "Worksheet",
      type: "string",
      advanced: true,
      hint: "Optional — resolve the table within one worksheet's collection.",
    },
    sessionIdParam,
  ],
  output: [
    { key: "index", type: "number", label: "Index of the first added row" },
    { key: "values", type: "array", label: "Added rows" },
  ],

  async execute(input, ctx): Promise<TableRow> {
    if (input.values === undefined || input.values === null) {
      throw new Error("Rows is required: supply a two-dimensional array of row values.");
    }

    const client = new GraphClient(ctx);
    const base = workbookPath(input);
    const table = segment(input.table);
    const path = input.worksheet?.trim()
      ? `${base}/worksheets/${segment(input.worksheet)}/tables/${table}/rows/add`
      : `${base}/tables/${table}/rows/add`;

    return await client.request<TableRow>(path, {
      method: "POST",
      body: compact({ values: input.values, index: input.index }),
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default addTableRows;
