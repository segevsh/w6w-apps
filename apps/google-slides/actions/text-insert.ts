import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, REVISION_PARAM, singleRequestBody } from "../lib/client.ts";

interface Input {
  presentationId: string;
  objectId: string;
  text: string;
  insertionIndex?: number;
  rowIndex?: number;
  columnIndex?: number;
  requiredRevisionId?: string;
}

/**
 * `insertText` via `presentations.batchUpdate`.
 *
 * Inserts into a shape **or** a table cell — one request for both. When
 * `cellLocation` is present "the object_id must refer to a table", so the two
 * cell indices are emitted together or not at all; supplying one without the
 * other is rejected here rather than producing a confusing 400 from Google.
 *
 * `insertionIndex` is "in Unicode code units, based on TextElement indexes",
 * zero-based, and defaults to 0 — i.e. omitting it prepends, it does not
 * append. Google also warns the index "may be adjusted to prevent insertions
 * inside" a surrogate pair or an autotext element, so the text can land a
 * character away from where you asked.
 */
const textInsert: ActionDefinition<Input> = {
  key: "text-insert",
  type: "perform",
  resource: "text",
  title: "Insert Text",
  description: "Insert text into a shape or a table cell at a character index.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "objectId",
      label: "Shape or Table Object ID",
      type: "string",
      required: true,
      hint: "Must refer to a table when the row/column below are set.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "A newline implicitly starts a new paragraph, inheriting the current paragraph style.",
    },
    {
      key: "insertionIndex",
      label: "Insertion Index",
      type: "number",
      hint:
        "Zero-based, in Unicode code units. Defaults to 0 — omitting it prepends rather than appends.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "rowIndex",
      label: "Table Row Index",
      type: "number",
      advanced: true,
      hint: "Table cells only. Zero-based. Must be given together with the column index.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "columnIndex",
      label: "Table Column Index",
      type: "number",
      advanced: true,
      hint: "Table cells only. Zero-based. Must be given together with the row index.",
      validation: { integer: true, min: 0 },
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — empty; this request returns nothing" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const hasRow = input.rowIndex !== undefined;
    const hasColumn = input.columnIndex !== undefined;
    if (hasRow !== hasColumn) {
      throw new Error("table cell location needs both `rowIndex` and `columnIndex`, or neither");
    }

    const request: Record<string, unknown> = {
      objectId: input.objectId,
      text: input.text,
      insertionIndex: input.insertionIndex ?? 0,
    };
    if (hasRow && hasColumn) {
      request.cellLocation = { rowIndex: input.rowIndex, columnIndex: input.columnIndex };
    }

    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ insertText: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default textInsert;
