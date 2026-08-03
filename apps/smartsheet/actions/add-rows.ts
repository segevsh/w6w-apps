import type { ActionDefinition } from "@w6w/types";
import {
  CELLS_HINT,
  compact,
  type GenericResult,
  type RowWrite,
  SmartsheetClient,
  toCells,
  toId,
} from "../lib/client.ts";

interface Input {
  sheetId: string;
  rows?: unknown[];
  cells?: unknown;
  location?:
    | "toBottom"
    | "toTop"
    | "parentId"
    | "siblingId"
    | "siblingIdAbove"
    | "parentIdToBottom";
  anchorRowId?: string;
  allowPartialSuccess?: boolean;
  overrideValidation?: boolean;
}

/**
 * `POST /sheets/{sheetId}/rows` — insert one or more rows.
 *
 * ## The cell model, stated plainly
 *
 * Smartsheet's own body documentation for this endpoint spells out the rule this
 * whole app is built around: `cells` "must be an array of Cell objects, where
 * each object is limited to the following attributes: **columnId** (required),
 * one of the following (required): **formula**, **value**, **objectValue** …".
 *
 * There is no column-title form. A cell is a `(columnId, value)` pair, and
 * `columnId` is a 16-digit int64 you get from List Columns or from Get Sheet.
 * This action accepts either a map keyed by column id or an array of full cell
 * objects (see `toCells`), and both go over the wire as `cells[].columnId`.
 *
 * Also from the same body doc, and worth knowing before a bulk load:
 *   - "Column Ids must be valid for the sheet … and must only be used once for
 *     each row in the operation."
 *   - "Max length for a cell value is 4000 characters after which truncation
 *     occurs **without warning**."
 *   - "When adding or updating rows, there is a 500 row limit for each API call."
 *
 * ## Location specifiers
 *
 * Default is the bottom of the sheet. The documented alternatives are `toTop`,
 * `toBottom`, `parentId`, `siblingId` (+ `above`), `indent` and `outdent`, with
 * the restriction "Use only one location-specifier attribute per request, unless
 * you use **parentId** and **toBottom** or **siblingId** and **above**". This
 * action exposes that as a single choice plus an anchor row id, which makes the
 * illegal combinations unrepresentable rather than merely discouraged. `indent`
 * and `outdent` are omitted here on purpose — they only make sense for EXISTING
 * rows, so they belong to Update Rows.
 *
 * Not idempotent: each call mints new row ids and Smartsheet offers no
 * idempotency key on this endpoint, so a retry duplicates the rows.
 */
const addRows: ActionDefinition<Input, GenericResult> = {
  key: "add-rows",
  type: "perform",
  resource: "row",
  title: "Add Rows",
  description:
    "Insert one or more rows into a sheet. Cells are addressed by column ID — never by column " +
    "title. Up to 500 rows per call.",
  idempotent: false,
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    {
      key: "cells",
      label: "Cells (single row)",
      type: "json",
      hint: `${CELLS_HINT} Use this for one row; use Rows for several.`,
    },
    {
      key: "rows",
      label: "Rows (bulk)",
      type: "json",
      hint: 'Array of row objects, each `{"cells": …}` using the same cell shape, e.g. ' +
        '`[{"cells": {"7960873114331012": "Task A"}}, {"cells": {"7960873114331012": "Task B"}}]`. ' +
        "Takes precedence over Cells. Maximum 500 rows per call.",
    },
    {
      key: "location",
      label: "Insert at",
      type: "select",
      default: "toBottom",
      options: [
        { value: "toBottom", label: "Bottom of the sheet (default)" },
        { value: "toTop", label: "Top of the sheet" },
        { value: "parentId", label: "First child of a parent row — needs Anchor row ID" },
        { value: "parentIdToBottom", label: "Last child of a parent row — needs Anchor row ID" },
        { value: "siblingId", label: "Below a specific row — needs Anchor row ID" },
        { value: "siblingIdAbove", label: "Above a specific row — needs Anchor row ID" },
      ],
      hint:
        "Smartsheet allows only one location specifier per request, except parentId+toBottom and " +
        "siblingId+above — this list encodes exactly the legal combinations.",
    },
    {
      key: "anchorRowId",
      label: "Anchor row ID",
      type: "string",
      hint: "The parent or sibling row id, for the four location choices that need one.",
    },
    {
      key: "allowPartialSuccess",
      label: "Allow partial success",
      type: "boolean",
      hint: "Let valid rows land even if others fail. The response then reports " +
        "`PARTIAL_SUCCESS` with a `failedItems` array instead of failing the whole call.",
    },
    {
      key: "overrideValidation",
      label: "Override validation",
      type: "boolean",
      hint: "Allow cell values outside a column's validation limits.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "SUCCESS or PARTIAL_SUCCESS" },
    { key: "resultCode", type: "number", label: "0 success, 3 partial success" },
    { key: "result", type: "array", label: "The created rows" },
    { key: "failedItems", type: "array", label: "Failures, when partial success is allowed" },
  ],

  execute(input, ctx) {
    const location = locationAttributes(input.location ?? "toBottom", input.anchorRowId);

    const rows: RowWrite[] = input.rows && Array.isArray(input.rows) && input.rows.length > 0
      ? input.rows.map((raw, i) => {
        const r = raw as Record<string, unknown>;
        return { ...location, cells: toCells(r.cells ?? r, `rows[${i}].cells`) };
      })
      : [{ ...location, cells: toCells(input.cells) }];

    return new SmartsheetClient(ctx).request<GenericResult>(
      `/sheets/${encodeURIComponent(input.sheetId)}/rows`,
      {
        method: "POST",
        query: compact({
          allowPartialSuccess: input.allowPartialSuccess ? true : undefined,
          overrideValidation: input.overrideValidation ? true : undefined,
        }),
        body: rows,
      },
    );
  },
};

/**
 * Turn the single `location` choice back into the attribute pair Smartsheet
 * expects. Kept exported for the unit tests, which pin every branch — an
 * illegal pair here is a silent misplacement, not an error.
 */
export function locationAttributes(
  location: NonNullable<Input["location"]>,
  anchorRowId?: string,
): Partial<RowWrite> {
  const anchor = (what: string) => {
    if (!anchorRowId) throw new Error(`location "${location}" requires an Anchor row ID`);
    return toId(anchorRowId, what);
  };
  switch (location) {
    case "toTop":
      return { toTop: true };
    case "parentId":
      return { parentId: anchor("anchorRowId") };
    case "parentIdToBottom":
      return { parentId: anchor("anchorRowId"), toBottom: true };
    case "siblingId":
      return { siblingId: anchor("anchorRowId") };
    case "siblingIdAbove":
      return { siblingId: anchor("anchorRowId"), above: true };
    default:
      return { toBottom: true };
  }
}

export default addRows;
