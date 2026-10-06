import type { Param } from "@w6w/types";

/** `table_name` — every table-scoped endpoint takes it (or `table_id`, which this app does not use). */
export const tableNameParam: Param = {
  key: "tableName",
  label: "Table name",
  type: "string",
  required: true,
  hint: "The table's name exactly as shown in the base, e.g. Table1.",
};

export const rowIdParam: Param = {
  key: "rowId",
  label: "Row ID",
  type: "string",
  required: true,
  hint: "The row's `_id` (22 characters, e.g. Bko1e60YT-egit2SljWSZA), as returned by List Rows.",
};

export const rowIdsParam: Param = {
  key: "rowIds",
  label: "Row IDs",
  type: "json",
  required: true,
  hint: 'A JSON array of row `_id` values, e.g. ["Bko1e60YT-egit2SljWSZA"].',
};

/** Accept a real value or its JSON text — a form field may deliver either. */
export function parseJson(value: unknown, what: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${what} is not valid JSON`);
  }
}

export function asArray(value: unknown, what: string): unknown[] {
  const parsed = parseJson(value, what);
  if (!Array.isArray(parsed)) throw new Error(`${what} must be a JSON array`);
  return parsed;
}

export function asObject(value: unknown, what: string): Record<string, unknown> {
  const parsed = parseJson(value, what);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${what} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

export function asStringArray(value: unknown, what: string): string[] {
  const items = asArray(value, what);
  if (items.length === 0) throw new Error(`${what} must not be empty`);
  return items.map((item) => String(item));
}
