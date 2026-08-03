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
  rowId?: string;
  cells?: unknown;
  rows?: unknown[];
  locked?: boolean;
  expanded?: boolean;
  indent?: boolean;
  outdent?: boolean;
  allowPartialSuccess?: boolean;
  overrideValidation?: boolean;
}

/**
 * `PUT /sheets/{sheetId}/rows` — update cells, lock state, expansion or position
 * on existing rows.
 *
 * `id` is the only required attribute; everything else is optional and omitted
 * fields are left alone. Cells follow the same `(columnId, value)` contract as
 * Add Rows — Smartsheet's body doc repeats it verbatim, "columnId (required)"
 * plus one of `formula` / `value` / `objectValue`.
 *
 * Two cell subtleties that only show up on update, both from that doc:
 *   - To CLEAR a cell, send `value: ""`. "Empty string values are converted to
 *     null." Omitting the cell leaves the existing value untouched — the two are
 *     not the same instruction, so `toCells` preserves an explicit empty string
 *     and an explicit null.
 *   - `strict: false` enables lenient parsing, which is how a date typed as
 *     `"2026-08-03"` into a text column gets coerced rather than rejected.
 *
 * `indent` and `outdent` live here rather than on Add Rows because they only
 * apply to rows that already exist, and each "must have a value of 1".
 *
 * Marked **idempotent**: the operation is a set of absolute assignments keyed by
 * row id, so replaying the same call converges on the same sheet state. That
 * stops being true if `indent`/`outdent` is used — those are relative moves, and
 * repeating one indents twice — so the hint says so and a workflow that retries
 * should not combine them.
 */
const updateRows: ActionDefinition<Input, GenericResult> = {
  key: "update-rows",
  type: "perform",
  resource: "row",
  title: "Update Rows",
  description:
    "Update cell values, lock state, expansion or position on existing rows. Cells are addressed " +
    "by column ID. Send an empty string to clear a cell; omit the cell to leave it alone.",
  idempotent: true,
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    {
      key: "rowId",
      label: "Row ID",
      type: "string",
      hint: "The row to update. Use Rows instead to update several at once.",
    },
    {
      key: "cells",
      label: "Cells",
      type: "json",
      hint: `${CELLS_HINT} Send \`""\` as a value to clear a cell.`,
    },
    {
      key: "rows",
      label: "Rows (bulk)",
      type: "json",
      hint:
        'Array of row objects, each `{"id": …, "cells": …}`. Takes precedence over Row ID and ' +
        "Cells. Maximum 500 rows per call.",
    },
    { key: "locked", label: "Locked", type: "boolean", hint: "Lock or unlock the row." },
    { key: "expanded", label: "Expanded", type: "boolean", hint: "Expand or collapse the row." },
    {
      key: "indent",
      label: "Indent",
      type: "boolean",
      hint:
        "Indent the row one level (sent as `indent: 1`). A RELATIVE move — replaying this call " +
        "indents again, so do not combine it with an automatic retry.",
    },
    {
      key: "outdent",
      label: "Outdent",
      type: "boolean",
      hint: "Outdent the row one level (sent as `outdent: 1`). Also relative — see Indent.",
    },
    {
      key: "allowPartialSuccess",
      label: "Allow partial success",
      type: "boolean",
      hint: "Let valid rows update even if others fail; the response reports `PARTIAL_SUCCESS`.",
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
    { key: "result", type: "array", label: "The updated rows" },
    { key: "failedItems", type: "array", label: "Failures, when partial success is allowed" },
  ],

  execute(input, ctx) {
    const shared = compact({
      locked: input.locked,
      expanded: input.expanded,
      // Smartsheet documents these as "must have a value of 1".
      indent: input.indent ? 1 : undefined,
      outdent: input.outdent ? 1 : undefined,
    });

    let rows: RowWrite[];
    if (Array.isArray(input.rows) && input.rows.length > 0) {
      rows = input.rows.map((raw, i) => {
        const r = raw as Record<string, unknown>;
        if (r?.id === undefined || r.id === null || r.id === "") {
          throw new Error(`rows[${i}]: missing id — an update must name the row it changes`);
        }
        return {
          id: toId(r.id as string | number, `rows[${i}].id`),
          ...shared,
          ...(r.cells === undefined ? {} : { cells: toCells(r.cells, `rows[${i}].cells`) }),
        };
      });
    } else {
      if (!input.rowId) throw new Error("rowId is required unless Rows is supplied");
      rows = [{
        id: toId(input.rowId, "rowId"),
        ...shared,
        ...(input.cells === undefined ? {} : { cells: toCells(input.cells) }),
      }];
    }

    return new SmartsheetClient(ctx).request<GenericResult>(
      `/sheets/${encodeURIComponent(input.sheetId)}/rows`,
      {
        method: "PUT",
        query: compact({
          allowPartialSuccess: input.allowPartialSuccess ? true : undefined,
          overrideValidation: input.overrideValidation ? true : undefined,
        }),
        body: rows,
      },
    );
  },
};

export default updateRows;
