import type { Param } from "@w6w/types";

/**
 * Paging, shared by every list action.
 *
 * Vanta's own `pageSize` default is **10**, which on a tenant with four hundred
 * failing tests looks like a healthy tenant. The client always asks for 100 and
 * pages, and `hasNextPage` is returned so a truncated walk is visible.
 */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page to the end. Each page is one of the 50 requests a minute the API allows.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    showIf: { "==": [{ var: "returnAll" }, false] },
    hint: "Vanta caps a page at 100 — and defaults to 10, which is why this app never accepts " +
      "the default.",
  },
  {
    key: "maxPages",
    label: "Maximum Pages",
    type: "number",
    default: 50,
    advanced: true,
    showIf: { "==": [{ var: "returnAll" }, true] },
  },
];
