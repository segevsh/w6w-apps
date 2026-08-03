import type { ActionDefinition } from "@w6w/types";
import { csv, SmartsheetClient } from "../lib/client.ts";

interface Input {
  sheetId: string;
  include?: string[];
  exclude?: string[];
  columnIds?: string;
  rowIds?: string;
  rowNumbers?: string;
  rowsModifiedSince?: string;
  level?: number;
  page?: number;
  pageSize?: number;
}

/**
 * `GET /sheets/{sheetId}` — the sheet with its columns and rows.
 *
 * ## `include` and `exclude` change the SHAPE, not just the size
 *
 * This is the one endpoint where getting the flags wrong quietly changes what a
 * downstream step can read, so both enums are transcribed verbatim from the
 * OpenAPI document rather than guessed:
 *
 * **include** (14 values): `attachments`, `columnType`, `crossSheetReferences`,
 * `discussions`, `filters`, `filterDefinitions`, `format`, `ganttConfig`,
 * `objectValue`, `ownerInfo`, `proofs`, `rowPermalink`, `source`, `writerInfo`.
 *
 * Two are load-bearing for anyone reading cells:
 *   - **`columnType`** adds `columnType` to every cell, which is the only way to
 *     know what a `value` means without a separate List Columns call.
 *   - **`objectValue`** is what surfaces multi-contact and multi-picklist data as
 *     structured objects, and it only does so "when used in combination with a
 *     level query parameter".
 *
 * **exclude** (4 values): `filteredOutRows`, `linkInFromCellDetails`,
 * `linksOutToCellsDetails`, `nonexistentCells`.
 *
 * **`nonexistentCells` is the trap.** It "excludes empty cells" — so with it set,
 * a row's `cells` array no longer has one entry per column, and code that walks
 * cells positionally breaks. That is exactly why cells must be matched on
 * `columnId` and never on array index; this app's `toCells` enforces the same
 * discipline on the way out.
 *
 * `level` is the compatibility switch: `0` (default) renders multi-contact and
 * multi-picklist data as plain text/number, `1` uses real multi-contact columns,
 * `2` uses both multi-contact and multi-picklist columns.
 */
const getSheet: ActionDefinition<Input> = {
  key: "get-sheet",
  type: "read",
  resource: "sheet",
  title: "Get Sheet",
  description:
    "Get one sheet with its columns and rows. The Include and Exclude flags materially change the " +
    "response shape — read their hints before relying on a field being present.",
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "attachments", label: "attachments — sheet- and row-level attachment metadata" },
        { value: "columnType", label: "columnType — each cell's column type" },
        { value: "crossSheetReferences", label: "crossSheetReferences" },
        { value: "discussions", label: "discussions — sheet- and row-level" },
        { value: "filters", label: "filters — adds filteredOut on each row" },
        {
          value: "filterDefinitions",
          label: "filterDefinitions — filter type, operators, criteria",
        },
        { value: "format", label: "format — column, row, cell and summary formatting" },
        { value: "ganttConfig", label: "ganttConfig" },
        { value: "objectValue", label: "objectValue — needs Level 1 or 2 for multi-contact data" },
        { value: "ownerInfo", label: "ownerInfo — owner email and user id" },
        { value: "proofs", label: "proofs" },
        { value: "rowPermalink", label: "rowPermalink — direct link to each row" },
        { value: "source", label: "source — what the sheet was created from" },
        { value: "writerInfo", label: "writerInfo — createdBy / modifiedBy" },
      ],
      hint:
        "Sent as one comma-separated `include` param. `attachments` plus `discussions` are both " +
        "required to get discussion attachments.",
    },
    {
      key: "exclude",
      label: "Exclude",
      type: "multiselect",
      options: [
        { value: "filteredOutRows", label: "filteredOutRows — drop rows hidden by a sheet filter" },
        { value: "linkInFromCellDetails", label: "linkInFromCellDetails" },
        { value: "linksOutToCellsDetails", label: "linksOutToCellsDetails" },
        { value: "nonexistentCells", label: "nonexistentCells — drop empty cells" },
      ],
      hint: "`nonexistentCells` makes each row's `cells` array sparse — always match cells on " +
        "`columnId`, never on position.",
    },
    {
      key: "columnIds",
      label: "Column IDs",
      type: "string",
      hint:
        "Comma-separated column ids. Restricts both the `columns` array and every row's `cells` " +
        "array to these columns.",
    },
    {
      key: "rowIds",
      label: "Row IDs",
      type: "string",
      hint: "Comma-separated row ids to return.",
    },
    {
      key: "rowNumbers",
      label: "Row numbers",
      type: "string",
      hint: "Comma-separated row numbers. Non-existent numbers are ignored, not an error.",
    },
    {
      key: "rowsModifiedSince",
      label: "Rows modified since",
      type: "datetime",
      hint: "ISO-8601. Returns only rows modified on or after this instant.",
    },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: [
        { value: 0, label: "0 — text/number for multi-contact and multi-picklist (default)" },
        { value: 1, label: "1 — multi-contact columns; multi-picklist still text/number" },
        { value: 2, label: "2 — multi-contact and multi-picklist columns" },
      ],
      hint: "Pair with `objectValue` in Include to get structured multi-contact values.",
    },
    { key: "page", label: "Page", type: "number", hint: "Pages the sheet's ROWS." },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Rows per page. Defaults to 100.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Sheet ID" },
    { key: "name", type: "string", label: "Sheet name" },
    { key: "columns", type: "array", label: "Columns" },
    { key: "rows", type: "array", label: "Rows, each with a cells array keyed by columnId" },
    { key: "totalRowCount", type: "number", label: "Total rows" },
    { key: "version", type: "number", label: "Sheet version" },
  ],

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request(`/sheets/${encodeURIComponent(input.sheetId)}`, {
      query: {
        include: csv(input.include),
        exclude: csv(input.exclude),
        columnIds: csv(input.columnIds),
        rowIds: csv(input.rowIds),
        rowNumbers: csv(input.rowNumbers),
        rowsModifiedSince: input.rowsModifiedSince,
        level: input.level,
        page: input.page,
        pageSize: input.pageSize,
      },
    });
  },
};

export default getSheet;
