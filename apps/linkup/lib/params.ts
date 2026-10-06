import type { Param } from "@w6w/types";

/** Parse a `json` param that may arrive as an object/array or as a JSON string. */
export function jsonValue(v: unknown, label: string): unknown {
  if (typeof v !== "string") return v;
  const text = v.trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** A JSON Schema as the API wants it for `structuredOutputSchema`: a string. */
export function schemaString(v: unknown, label: string): string | undefined {
  const parsed = jsonValue(v, label);
  if (parsed === undefined || parsed === null) return undefined;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON Schema object`);
  }
  return typeof v === "string" ? v.trim() : JSON.stringify(parsed);
}

/** A JSON Schema as an object (the `/fetch` and `/extract` `schema` field). */
export function schemaObject(v: unknown, label: string): Record<string, unknown> | undefined {
  const parsed = jsonValue(v, label);
  if (parsed === undefined || parsed === null) return undefined;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON Schema object`);
  }
  return parsed as Record<string, unknown>;
}

export function list(v: string[] | string | undefined): string[] | undefined {
  const items = Array.isArray(v) ? v : String(v ?? "").split(/[\r\n,]+/);
  const out = items.map((s) => String(s).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function dateOnly(v: string | undefined, label: string): string | undefined {
  const t = (v ?? "").trim();
  if (!t) return undefined;
  if (!DATE.test(t)) throw new Error(`${label} must be a date in YYYY-MM-DD format`);
  return t;
}

export function required(v: string | undefined, label: string): string {
  const t = (v ?? "").trim();
  if (!t) throw new Error(`${label} is required`);
  return t;
}

export const pagingParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "1-based. Default 1.",
  },
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    validation: { integer: true, min: 1, max: 100 },
    hint: "Default 10, maximum 100.",
  },
  {
    key: "sortBy",
    label: "Sort by",
    type: "select",
    options: [{ value: "createdAt", label: "Created" }, { value: "updatedAt", label: "Updated" }],
  },
  {
    key: "sortDirection",
    label: "Sort direction",
    type: "select",
    options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    hint: "Default asc (oldest first).",
  },
];

export interface PagingInput {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
}

export function pagingQuery(i: PagingInput): Record<string, string | number | undefined> {
  return {
    page: i.page,
    pageSize: i.pageSize,
    sortBy: i.sortBy || undefined,
    sortDirection: i.sortDirection || undefined,
  };
}

export const PAGED_OUTPUT = [
  { key: "items", type: "array", label: "Tasks on this page" },
  { key: "metadata", type: "object", label: "page, pageSize, total, totalPages" },
] as const;

export const DOMAIN_PARAMS: Param[] = [
  {
    key: "includeDomains",
    label: "Only these domains",
    type: "text",
    hint: "One per line (up to 100). Default: the whole web.",
  },
  {
    key: "excludeDomains",
    label: "Exclude domains",
    type: "text",
    hint: "One per line.",
  },
];

export const DATE_PARAMS: Param[] = [
  {
    key: "fromDate",
    label: "From date",
    type: "string",
    placeholder: "2026-01-01",
    hint: "YYYY-MM-DD, after 1970-01-01 and before the to date.",
  },
  {
    key: "toDate",
    label: "To date",
    type: "string",
    placeholder: "2026-12-31",
    hint: "YYYY-MM-DD.",
  },
];
