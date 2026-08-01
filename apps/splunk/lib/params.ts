import type { Param } from "@w6w/types";

/** Splunk's `count`/`offset` pagination, shared by every listing endpoint. */
export const pagination: Param[] = [
  {
    key: "count",
    label: "Count",
    type: "number",
    default: 30,
    row: "page",
    validation: { min: 0, integer: true },
    hint: "Max items to return. `0` means unlimited — Splunk's own default is 30.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    default: 0,
    row: "page",
    validation: { min: 0, integer: true },
    advanced: true,
    hint: "Number of items to skip, for paging through a large result set.",
  },
];
