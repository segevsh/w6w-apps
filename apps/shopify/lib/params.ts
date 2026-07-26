import type { Param } from "@w6w/types";

/**
 * Shopify's cursor pagination. Once `pageInfo` is supplied, Shopify rejects
 * every other filter on the request — the cursor already encodes them.
 */
export const pagination: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    row: "page",
    validation: { min: 1, max: 250, integer: true },
    hint: "Shopify caps this at 250.",
  },
  {
    key: "pageInfo",
    label: "Page cursor",
    type: "string",
    row: "page",
    advanced: true,
    hint:
      "`nextPageInfo` from the previous call. When set, Shopify ignores — and rejects — the other filters.",
  },
];

export const pagedOutput = [
  { key: "data", type: "array" as const, label: "Results" },
  { key: "nextPageInfo", type: "string" as const, label: "Cursor for the next page" },
];
