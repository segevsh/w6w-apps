import type { Param } from "@w6w/types";

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: DEFAULT_LIMIT,
  validation: { integer: true, min: 1, max: MAX_LIMIT },
  hint:
    "Page size. Rippling's default is 50 and the maximum is 100; a larger value is refused with " +
    "a 400.",
};

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint:
    "Pass the previous page's `nextCursor` to fetch the next page. Pasting the whole `next_link` " +
    "URL also works. Leave empty for the first page.",
};

export function filterParam(fields: string[]): Param {
  return {
    key: "filter",
    label: "Filter",
    type: "string",
    placeholder: "status eq 'ACTIVE'",
    hint: `Rippling filter expression. Filterable fields here: ${fields.join(", ")}. ` +
      "Operators: eq, ne, gt, gte, lt, lte, in, and, or — e.g. `status in ('HIRED','ACCEPTED')`.",
  };
}

export function expandParam(fields: string[]): Param {
  return {
    key: "expand",
    label: "Expand",
    type: "string",
    placeholder: fields.slice(0, 2).join(","),
    hint: `Comma-separated related objects to inline (otherwise they come back null). ` +
      `Expandable here: ${fields.join(", ")}. Dot notation reaches one level deeper ` +
      "(e.g. `manager.user`); the API allows two levels and ten fields per request.",
  };
}

export function orderByParam(fields: string[]): Param {
  return {
    key: "orderBy",
    label: "Order by",
    type: "string",
    placeholder: "created_at desc",
    hint: `Comma-separated sort fields, each optionally followed by asc or desc. ` +
      `Sortable here: ${fields.join(", ")}.`,
  };
}

export const idParam: Param = {
  key: "id",
  label: "ID",
  type: "string",
  required: true,
  hint: "The record's Rippling id, as returned by the matching list action.",
};
