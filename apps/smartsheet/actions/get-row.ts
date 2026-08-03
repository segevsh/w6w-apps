import type { ActionDefinition } from "@w6w/types";
import { csv, SmartsheetClient } from "../lib/client.ts";

interface Input {
  sheetId: string;
  rowId: string;
  include?: string[];
  exclude?: string[];
  level?: number;
}

/**
 * `GET /sheets/{sheetId}/rows/{rowId}` — one row.
 *
 * ## There is no "list rows" endpoint, and this app does not pretend otherwise
 *
 * Rows are not an independently listable collection in Smartsheet 2.0. The only
 * ways to obtain many rows are Get Sheet (optionally narrowed with `rowIds`,
 * `rowNumbers`, `rowsModifiedSince` or `columnIds`) and Search Sheet. So there
 * is no `list-rows` action here — inventing one over `GET /sheets/{id}` would
 * misrepresent the paging semantics, which page the SHEET, not a row collection.
 *
 * ## `include=columns` is the one flag worth knowing
 *
 * This endpoint's `include` enum is only `columns` and `filters` — a much
 * shorter list than Get Sheet's. `columns` "adds a columns array that specifies
 * all of the columns for the sheet", which is exactly the lookup table needed to
 * make sense of a row's `cells[].columnId` values in a single call. Without it
 * the response is cells keyed by opaque numeric ids and nothing to map them to.
 *
 * `exclude` reuses the sheet-level enum, including `nonexistentCells` — set that
 * and the row's `cells` array becomes sparse, so match on `columnId`, never on
 * position.
 */
const getRow: ActionDefinition<Input> = {
  key: "get-row",
  type: "read",
  resource: "row",
  title: "Get Row",
  description:
    "Get one row by id. Add `columns` to Include to get the column list in the same response — " +
    "cells carry only `columnId`, so without it there is nothing to map ids to titles.",
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    { key: "rowId", label: "Row ID", type: "string", required: true },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "columns", label: "columns — the sheet's full column list, for cell context" },
        { value: "filters", label: "filters — adds filteredOut to the row" },
      ],
      hint: "This endpoint accepts only these two; Get Sheet's longer list does not apply here.",
    },
    {
      key: "exclude",
      label: "Exclude",
      type: "multiselect",
      options: [
        { value: "filteredOutRows", label: "filteredOutRows" },
        { value: "linkInFromCellDetails", label: "linkInFromCellDetails" },
        { value: "linksOutToCellsDetails", label: "linksOutToCellsDetails" },
        { value: "nonexistentCells", label: "nonexistentCells — drop empty cells" },
      ],
      hint: "`nonexistentCells` makes `cells` sparse — always match on `columnId`.",
    },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: [
        { value: 0, label: "0 — text/number for multi-contact and multi-picklist (default)" },
        { value: 1, label: "1 — multi-contact columns" },
        { value: 2, label: "2 — multi-contact and multi-picklist columns" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Row ID" },
    { key: "sheetId", type: "number", label: "Parent sheet ID" },
    { key: "rowNumber", type: "number", label: "Row number within the sheet" },
    { key: "cells", type: "array", label: "Cells, each identified by columnId" },
    { key: "columns", type: "array", label: "Columns — only when `columns` is in Include" },
  ],

  execute(input, ctx) {
    const { sheetId, rowId } = input;
    return new SmartsheetClient(ctx).request(
      `/sheets/${encodeURIComponent(sheetId)}/rows/${encodeURIComponent(rowId)}`,
      {
        query: {
          include: csv(input.include),
          exclude: csv(input.exclude),
          level: input.level,
        },
      },
    );
  },
};

export default getRow;
