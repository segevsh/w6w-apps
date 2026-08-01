import type { Param } from "@w6w/types";

export const tableParam: Param = {
  key: "table",
  label: "Table",
  type: "string",
  required: true,
  hint: "Name of the table or view, exactly as it appears in the schema.",
};

export const selectParam: Param = {
  key: "select",
  label: "Columns to return",
  type: "string",
  default: "*",
  hint: "PostgREST `select=` syntax, e.g. `id,name,created_at` or `*`. Supports renaming " +
    "(`fullName:full_name`) and embedded resources (`id,author:authors(name)`).",
};

/** A single-row-or-many filter fragment. Required on write actions as a safety guard. */
export function filtersParam(opts: { required?: boolean; hint?: string } = {}): Param {
  return {
    key: "filters",
    label: "Filters",
    type: "string",
    required: opts.required ?? false,
    hint: opts.hint ??
      'Raw PostgREST filter query string, e.g. "id=eq.5" or "age=lt.13&student=is.true". ' +
        'Joined with "&" for multiple conditions (AND) — see PostgREST\'s horizontal filtering ' +
        "docs for the full operator list.",
  };
}

export const orderParam: Param = {
  key: "order",
  label: "Order by",
  type: "string",
  row: "page",
  hint: "PostgREST `order=` syntax, e.g. `created_at.desc` or `age.desc,height.asc.nullslast`.",
};

export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  row: "page",
  validation: { min: 1, integer: true },
  hint: "Max rows to return. Maps to PostgREST's `limit=`.",
};

export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  row: "page",
  advanced: true,
  validation: { min: 0, integer: true },
  hint: "Rows to skip before the page starts. Maps to PostgREST's `offset=`.",
};

export const rowsOutput = [
  { key: "rows", type: "array" as const, label: "Rows" },
];
