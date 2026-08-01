import type { Param } from "@w6w/types";

/** Okta's `limit` + `after`-cursor pagination, the form its list endpoints take. */
export const pagination: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 20,
    row: "page",
    validation: { min: 1, max: 200, integer: true },
    hint: "Okta caps this at 200.",
  },
  {
    key: "after",
    label: "After cursor",
    type: "string",
    row: "page",
    advanced: true,
    hint: "The `after` value from the previous page's `Link` header.",
  },
];
