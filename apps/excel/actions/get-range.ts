import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  odataList,
  rangeSegment,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { addressParam, sessionIdParam, workbookParams, worksheetParam } from "../lib/params.ts";

interface Input extends WorkbookRef {
  worksheet: string;
  address?: string;
  select?: string[];
  sessionId?: string;
}

/** A subset of `workbookRange`; Graph returns the full resource. */
interface Range {
  address?: string;
  values?: unknown[][];
  text?: string[][];
  formulas?: unknown[][];
  numberFormat?: unknown[][];
  valueTypes?: string[][];
  rowCount?: number;
  columnCount?: number;
  cellCount?: number;
  [k: string]: unknown;
}

/**
 * `GET /me/drive/items/{id}/workbook/worksheets/{id|name}/range(address='…')`
 * `GET /me/drive/root:/{item-path}:/workbook/worksheets/{id|name}/range(address='…')`
 *
 * https://learn.microsoft.com/en-us/graph/api/worksheet-range
 *
 * `address` is optional; omit it and Graph returns the *entire* worksheet range,
 * which on a real sheet is a million rows and is almost never what you want —
 * Get Used Range is the action for "everything with data in it".
 *
 * The range resource carries several parallel grids for the same cells, and the
 * difference matters:
 *
 *   - `values` — raw typed values (string, number, boolean; an error cell
 *     returns its error string).
 *   - `text` — what Excel *displays*, independent of column width. The `#####`
 *     substitution the UI does is not reflected here.
 *   - `formulas` — A1-style formulas. `formulasLocal` and `formulasR1C1` are the
 *     localised and R1C1 variants.
 *   - `valueTypes` — `Unknown` | `Empty` | `String` | `Integer` | `Double` |
 *     `Boolean` | `Error`, per cell.
 *
 * Use `$select` to fetch only the grid you need; the others are not free on a
 * large range.
 *
 * Two documented edges worth knowing before you read the output. An **unbounded**
 * address (`C:C`, `2:2`) returns `null` for the cell-level grids while
 * `address` and `cellCount` still describe the range. And a range over roughly
 * 5M cells, or one whose formatting is non-uniform, can return `null` for
 * individual properties rather than failing.
 */
const getRange: ActionDefinition<Input, Range> = {
  key: "get-range",
  type: "read",
  resource: "range",
  title: "Get Range",
  description:
    "Read a range of cells — values, display text, formulas, number formats and value types.",
  params: [
    ...workbookParams(),
    worksheetParam(),
    addressParam(
      false,
      "A1-style address, e.g. `A1:D5`. Leave empty for the entire worksheet range — a million rows. For 'everything with data', use Get Used Range instead.",
    ),
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "OData `$select`, e.g. `values`, `text`, `formulas`, `address`. Cuts a large range's response down substantially.",
    },
    sessionIdParam,
  ],
  output: [
    { key: "address", type: "string", label: "Address" },
    { key: "values", type: "array", label: "Values" },
    { key: "text", type: "array", label: "Display text" },
    { key: "formulas", type: "array", label: "Formulas" },
    { key: "valueTypes", type: "array", label: "Value types" },
    { key: "rowCount", type: "number", label: "Rows" },
    { key: "columnCount", type: "number", label: "Columns" },
  ],

  async execute(input, ctx): Promise<Range> {
    const client = new GraphClient(ctx);
    const path = `${workbookPath(input)}/worksheets/${segment(input.worksheet)}` +
      rangeSegment(input.address);

    return await client.request<Range>(path, {
      query: { $select: odataList(input.select) },
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default getRange;
