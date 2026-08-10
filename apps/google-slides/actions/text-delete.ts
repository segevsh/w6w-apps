import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, REVISION_PARAM, singleRequestBody } from "../lib/client.ts";

interface Input {
  presentationId: string;
  objectId: string;
  rangeType?: "ALL" | "FIXED_RANGE" | "FROM_START_INDEX";
  startIndex?: number;
  endIndex?: number;
  rowIndex?: number;
  columnIndex?: number;
  requiredRevisionId?: string;
}

/**
 * `deleteText` via `presentations.batchUpdate`.
 *
 * `Range` is the fiddly part, and each arm has a hard rule the API enforces
 * with a 400 — so they are enforced here instead, where the message can say
 * which one you broke:
 *
 *   - `ALL` — neither index may be specified;
 *   - `FIXED_RANGE` — both indices are required;
 *   - `FROM_START_INDEX` — `startIndex` is required and `endIndex` must be absent.
 *
 * Also worth knowing: "there is always an implicit newline character at the end
 * of a shape's or table cell's text that cannot be deleted", so `ALL` empties
 * the box but never removes it, and a `FIXED_RANGE` running to the very end
 * will not delete that final newline.
 */
const textDelete: ActionDefinition<Input> = {
  key: "text-delete",
  type: "perform",
  resource: "text",
  title: "Delete Text",
  description: "Delete a range of text from a shape or a table cell.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    { key: "objectId", label: "Shape or Table Object ID", type: "string", required: true },
    {
      key: "rangeType",
      label: "Range Type",
      type: "select",
      default: "ALL",
      options: [
        { value: "ALL", label: "All — the whole text (no indices)" },
        { value: "FIXED_RANGE", label: "Fixed range — start and end" },
        { value: "FROM_START_INDEX", label: "From start index — start to the end" },
      ],
    },
    {
      key: "startIndex",
      label: "Start Index",
      type: "number",
      hint: "Zero-based. Required for Fixed range and From start index.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "endIndex",
      label: "End Index",
      type: "number",
      hint: "Zero-based, exclusive. Required for Fixed range, forbidden otherwise.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "rowIndex",
      label: "Table Row Index",
      type: "number",
      advanced: true,
      hint: "Table cells only. Must be given together with the column index.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "columnIndex",
      label: "Table Column Index",
      type: "number",
      advanced: true,
      hint: "Table cells only. Must be given together with the row index.",
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
    const type = input.rangeType ?? "ALL";
    const textRange: Record<string, unknown> = { type };

    if (type === "ALL") {
      if (input.startIndex !== undefined || input.endIndex !== undefined) {
        throw new Error("range type ALL must not carry `startIndex` or `endIndex`");
      }
    } else if (type === "FIXED_RANGE") {
      if (input.startIndex === undefined || input.endIndex === undefined) {
        throw new Error("range type FIXED_RANGE requires both `startIndex` and `endIndex`");
      }
      textRange.startIndex = input.startIndex;
      textRange.endIndex = input.endIndex;
    } else {
      if (input.startIndex === undefined) {
        throw new Error("range type FROM_START_INDEX requires `startIndex`");
      }
      if (input.endIndex !== undefined) {
        throw new Error("range type FROM_START_INDEX must not carry `endIndex`");
      }
      textRange.startIndex = input.startIndex;
    }

    const hasRow = input.rowIndex !== undefined;
    const hasColumn = input.columnIndex !== undefined;
    if (hasRow !== hasColumn) {
      throw new Error("table cell location needs both `rowIndex` and `columnIndex`, or neither");
    }

    const request: Record<string, unknown> = { objectId: input.objectId, textRange };
    if (hasRow && hasColumn) {
      request.cellLocation = { rowIndex: input.rowIndex, columnIndex: input.columnIndex };
    }

    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ deleteText: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default textDelete;
