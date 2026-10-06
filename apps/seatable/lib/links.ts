import type { Param } from "@w6w/types";
import { asObject } from "./params.ts";

/**
 * The three link-writing endpoints (`POST/PUT/DELETE /links/`) share one body.
 * Unlike the row endpoints they take table IDS (`_id`, e.g. `0000`) and the
 * link column's 4-character `link_id`, not names — both come from Get Base
 * Metadata (`tables[]._id`, `columns[].data.link_id`).
 */
export const linkParams: Param[] = [
  {
    key: "tableId",
    label: "Table ID",
    type: "string",
    required: true,
    hint: "The `_id` of the table that holds the link column, from Get Base Metadata.",
  },
  {
    key: "otherTableId",
    label: "Linked table ID",
    type: "string",
    required: true,
    hint: "The `_id` of the table the link column points to.",
  },
  {
    key: "linkId",
    label: "Link ID",
    type: "string",
    required: true,
    validation: { minLength: 4, maxLength: 4 },
    hint: "The link column's `data.link_id` (4 characters) from Get Base Metadata — not its key.",
  },
  {
    key: "otherRowsIdsMap",
    label: "Rows map",
    type: "json",
    required: true,
    hint: "A JSON object: each key a row ID of the table, each value an array of row IDs of the " +
      'linked table, e.g. {"G5rbgqudTKKfAm1-cjnjbQ": ["XzdZfL2oS-aILnhfagTWEg"]}.',
  },
];

export function linkBody(input: {
  tableId: string;
  otherTableId: string;
  linkId: string;
  otherRowsIdsMap: unknown;
}): Record<string, unknown> {
  return {
    table_id: input.tableId,
    other_table_id: input.otherTableId,
    link_id: input.linkId,
    other_rows_ids_map: asObject(input.otherRowsIdsMap, "Rows map"),
  };
}
