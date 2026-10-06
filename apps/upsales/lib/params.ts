import type { OutputField, Param } from "@w6w/types";

/** A required numeric id path parameter. */
export function idParam(key: string, label: string, hint?: string): Param {
  return {
    key,
    label,
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    ...(hint ? { hint } : {}),
  };
}

export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 100,
  validation: { integer: true, min: 1, max: 2000 },
  hint: "Entries per page. Upsales defaults to 1000 and caps at 2000.",
};

export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  validation: { integer: true, min: 0 },
  hint: "Number of entries to skip. For a full crawl sort on id and filter id=gt:<last id>.",
};

export const sortParam: Param = {
  key: "sort",
  label: "Sort",
  type: "string",
  hint: "Field to sort by, e.g. `id`.",
};

export const filterParam: Param = {
  key: "filter",
  label: "Filter",
  type: "json",
  hint: 'Object of Upsales filters, attribute -> "comparison:value", e.g. ' +
    '{"user.id":"ne:1","regDate":"gte:2026-01-01"}. Comparisons: eq, ne, gt, gte, lt, lte. ' +
    'Custom fields use {"custom":"eq:4:1"}.',
};

export const listParams: Param[] = [limitParam, offsetParam, sortParam, filterParam];

export const fieldsParam: Param = {
  key: "fields",
  label: "Additional fields",
  type: "json",
  hint: "Any other Upsales fields as a JSON object (custom fields, nested objects). " +
    "Parameters above take precedence over the same key here.",
};

export const listOutput: OutputField[] = [
  { key: "data", type: "array", label: "Matching records" },
  { key: "total", type: "number", label: "Total matches (before paging)" },
  { key: "limit", type: "number", label: "Page size used" },
  { key: "offset", type: "number", label: "Offset used" },
];
