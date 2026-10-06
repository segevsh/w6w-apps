import type { Param } from "@w6w/types";

/** Plivo lists page with `limit` (1–20, default 20) and `offset`. */
export const PAGE_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Results per page. Plivo caps this at 20 (the default).",
    validation: { min: 1, max: 20, integer: true },
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    hint: "Number of records to skip. Page with `meta.next` / `meta.total_count` in the result.",
    validation: { min: 0, integer: true },
  },
];

export interface Page {
  limit?: number;
  offset?: number;
}
