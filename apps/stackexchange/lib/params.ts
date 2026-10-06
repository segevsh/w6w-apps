import type { OutputField, Param } from "@w6w/types";

export const siteParam: Param = {
  key: "site",
  label: "Site",
  type: "string",
  default: "stackoverflow",
  hint:
    "The api_site_parameter of the community: stackoverflow, serverfault, superuser, askubuntu, ... List them with Site List.",
};

export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "1-based page number. Keep going while `hasMore` is true.",
  validation: { min: 1, integer: true },
};

export const pageSizeParam: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  hint: "Items per page, 0 to 100 (API default 30).",
  validation: { min: 0, max: 100, integer: true },
};

export const orderParam: Param = {
  key: "order",
  label: "Order",
  type: "select",
  options: [
    { value: "desc", label: "Descending (default)" },
    { value: "asc", label: "Ascending" },
  ],
};

export const fromDateParam: Param = {
  key: "fromDate",
  label: "From date",
  type: "string",
  hint: "Only items created on or after this. ISO 8601 or Unix seconds.",
};

export const toDateParam: Param = {
  key: "toDate",
  label: "To date",
  type: "string",
  hint: "Only items created on or before this. ISO 8601 or Unix seconds.",
};

export const minParam: Param = {
  key: "min",
  label: "Min",
  type: "string",
  hint: "Lower bound on the field the chosen Sort orders by (a number, date, or name).",
};

export const maxParam: Param = {
  key: "max",
  label: "Max",
  type: "string",
  hint: "Upper bound on the field the chosen Sort orders by.",
};

export const filterParam: Param = {
  key: "filter",
  label: "Filter",
  type: "string",
  hint:
    "A filter name or id controlling which fields come back. Use `withbody` to include post bodies (omitted by default).",
};

export const taggedParam: Param = {
  key: "tagged",
  label: "Tags",
  type: "string",
  hint: "Semicolon- or comma-separated tags.",
};

export const sortParam = (options: string[], defaultSort: string): Param => ({
  key: "sort",
  label: "Sort",
  type: "select",
  options: options.map((value) => ({ value, label: value })),
  hint: `Sort field (default ${defaultSort}).`,
});

export const idsParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "string",
  required: true,
  hint,
});

/** The wrapper-object output every action returns. */
export const LIST_OUTPUT: OutputField[] = [
  { key: "items", type: "array", label: "Items" },
  { key: "count", type: "number", label: "Items on this page" },
  { key: "hasMore", type: "boolean", label: "More pages available" },
  { key: "quotaRemaining", type: "number", label: "Daily quota remaining" },
  { key: "quotaMax", type: "number", label: "Daily quota" },
  { key: "backoff", type: "number", label: "Seconds to wait before calling this method again" },
  { key: "total", type: "number", label: "Total matches (only with a filter that includes it)" },
];
