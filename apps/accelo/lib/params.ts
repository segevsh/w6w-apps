import type { Param } from "@w6w/types";

/** Accelo's offset paging: `_page` is 0-based and `_limit` tops out at 100. */
export const pagination: Param[] = [
  {
    key: "limit",
    label: "Page size",
    type: "number",
    default: 50,
    row: "page",
    validation: { min: 1, max: 100, integer: true },
    hint: "`_limit` — Accelo's default is 10 and the maximum is 100.",
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 0,
    row: "page",
    validation: { min: 0, integer: true },
    hint: "`_page` — zero-based, so the first page is 0.",
  },
];

/** Query refinements every list endpoint takes. */
export const listRefinements: Param[] = [
  {
    key: "search",
    label: "Search",
    type: "string",
    hint: "`_search` — free text over the fields the endpoint searches (names, email, etc.).",
  },
  {
    key: "filters",
    label: "Filters",
    type: "string",
    advanced: true,
    placeholder: "standing(active),date_created_after(1490140800)",
    hint:
      "Raw `_filters` expression, comma-separated; each endpoint lists its own filters in the API reference.",
  },
  {
    key: "orderBy",
    label: "Order by",
    type: "string",
    advanced: true,
    row: "order",
    placeholder: "date_created",
    hint: "Field for an `order_by_asc/desc(field)` filter. Default order is ascending `id`.",
  },
  {
    key: "orderDirection",
    label: "Order direction",
    type: "select",
    advanced: true,
    row: "order",
    default: "asc",
    options: [
      { value: "asc", label: "Ascending" },
      { value: "desc", label: "Descending" },
    ],
  },
  {
    key: "fields",
    label: "Extra fields",
    type: "string",
    advanced: true,
    placeholder: "website,phone,postal_address(city)",
    hint:
      "`_fields` — Accelo returns only a small default set; name optional fields or linked objects here, or `_ALL`.",
  },
];

/** `_fields` on a single-object read or a write. */
export const fieldsParam: Param = {
  key: "fields",
  label: "Extra fields",
  type: "string",
  advanced: true,
  placeholder: "_ALL",
  hint: "`_fields` — optional fields or linked objects to return, or `_ALL`.",
};

export const listOutput = [
  { key: "items", type: "array" as const, label: "Items" },
  { key: "page", type: "number" as const, label: "Page" },
  { key: "limit", type: "number" as const, label: "Page size" },
  { key: "hasMore", type: "boolean" as const, label: "Another page may exist" },
];

/**
 * Accelo returns every object with its `id` (a string on the wire) plus a small default
 * set; the field that names the object differs by resource. Anything else is requested
 * with `_fields`, so only the always-present keys are declared.
 */
const NAME_FIELDS: Record<string, Array<[string, string]>> = {
  company: [["name", "Name"]],
  contact: [["firstname", "First name"], ["surname", "Surname"]],
  activity: [["subject", "Subject"]],
  task: [["title", "Title"]],
  job: [["title", "Title"]],
  issue: [["title", "Title"]],
  request: [["title", "Title"]],
  prospect: [["title", "Title"]],
  invoice: [["invoice_number", "Invoice number"]],
  staff: [["firstname", "First name"], ["surname", "Surname"]],
};

export function objectOutput(resource: string) {
  return [
    { key: "id", type: "string" as const, label: "ID" },
    ...(NAME_FIELDS[resource] ?? []).map(([key, label]) => ({
      key,
      type: "string" as const,
      label,
    })),
  ];
}
