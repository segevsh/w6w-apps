import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  GraphClient,
  rangeSegment,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { addressParam, sessionIdParam, workbookParams, worksheetParam } from "../lib/params.ts";

interface Input extends WorkbookRef {
  worksheet: string;
  address: string;
  values?: unknown;
  formulas?: unknown;
  numberFormat?: unknown;
  sessionId?: string;
}

interface Range {
  address?: string;
  values?: unknown[][];
  rowCount?: number;
  columnCount?: number;
  [k: string]: unknown;
}

/**
 * `PATCH /me/drive/items/{id}/workbook/worksheets/{id|name}/range(address='…')`
 * `PATCH /me/drive/root:/{item-path}:/workbook/worksheets/{id|name}/range(address='…')`
 *
 * https://learn.microsoft.com/en-us/graph/api/range-update
 *
 * The writable grids are `values`, `formulas`, `formulasLocal`, `formulasR1C1`,
 * `numberFormat`, `rowHidden` and `columnHidden`. This action exposes the three
 * that matter for data entry, and they can be combined in one call.
 *
 * Four conventions the API defines, all of which are easy to get wrong:
 *
 *   - **`null` inside a grid means "leave this cell alone".** It is how you set
 *     the number format on one column without disturbing the rest.
 *   - **`null` as a whole property is invalid.** `{"values": null}` is rejected;
 *     there is no "clear by nulling".
 *   - **`""` means clear.** An empty string clears the value, resets
 *     `numberFormat` to `General`, or clears the formula.
 *   - **A single value fills the range.** If the input grid is one cell and the
 *     target is bigger, Excel applies it to every cell — the API's stated
 *     equivalent of Ctrl+Enter in the UI.
 *
 * `address` is required here, unlike Get Range: writing to an unbounded range
 * (`A:B`) is explicitly not allowed and writing to the whole sheet by accident
 * is not a mistake worth making convenient. Very large ranges should be written
 * in several smaller calls — Microsoft's own recommendation, because a single
 * oversized write can fail on resource utilisation.
 *
 * Idempotent: it sets cells to stated values, so replaying it converges.
 */
const updateRange: ActionDefinition<Input, Range> = {
  key: "update-range",
  type: "perform",
  resource: "range",
  title: "Update Range",
  description:
    'Write values, formulas and/or number formats into a range of cells. `null` inside a grid skips that cell; `""` clears it.',
  idempotent: true,
  params: [
    ...workbookParams(),
    worksheetParam(),
    addressParam(
      true,
      "A1-style address, e.g. `A1:D5`. Required — unbounded addresses (`A:B`) cannot be written to.",
    ),
    {
      key: "values",
      label: "Values",
      type: "json",
      placeholder: '[["Region","Total"],["EMEA",1200]]',
      hint:
        'Two-dimensional array, row-major. `null` leaves a cell untouched, `""` clears it. A single-cell array fills the whole range.',
    },
    {
      key: "formulas",
      label: "Formulas",
      type: "json",
      advanced: true,
      placeholder: '[[null,"=SUM(A1:A9)"]]',
      hint: "Two-dimensional array of A1-style formulas, same null/blank rules as Values.",
    },
    {
      key: "numberFormat",
      label: "Number formats",
      type: "json",
      advanced: true,
      placeholder: '[[null,"m/d/yyyy;@"]]',
      hint: 'Two-dimensional array of Excel number-format codes. `""` resets a cell to `General`.',
    },
    sessionIdParam,
  ],
  output: [
    { key: "address", type: "string", label: "Address" },
    { key: "values", type: "array", label: "Values" },
    { key: "rowCount", type: "number", label: "Rows" },
    { key: "columnCount", type: "number", label: "Columns" },
  ],

  async execute(input, ctx): Promise<Range> {
    const body = compact({
      values: input.values,
      formulas: input.formulas,
      numberFormat: input.numberFormat,
    });
    if (Object.keys(body).length === 0) {
      throw new Error(
        "Nothing to write: set at least one of Values, Formulas or Number formats.",
      );
    }

    const client = new GraphClient(ctx);
    const path = `${workbookPath(input)}/worksheets/${segment(input.worksheet)}` +
      rangeSegment(input.address);

    return await client.request<Range>(path, {
      method: "PATCH",
      body,
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default updateRange;
