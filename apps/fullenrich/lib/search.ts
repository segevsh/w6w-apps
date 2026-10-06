import type { Param } from "@w6w/types";
import { jsonValue, strList } from "./client.ts";

/** `["a","b"]` → `[{ value: "a" }, { value: "b" }]`, the shape every FullEnrich list filter takes. */
export function valueFilter(input: unknown): { value: string }[] | undefined {
  const list = strList(input);
  return list ? list.map((value) => ({ value })) : undefined;
}

/**
 * Merge the raw `filters` object with the convenience params. A convenience
 * param wins over the same key in `filters`. Unset params are never sent.
 */
export function mergeFilters(
  raw: unknown,
  named: Record<string, unknown>,
): Record<string, unknown> {
  const base = jsonValue(raw);
  const out: Record<string, unknown> = base && typeof base === "object" && !Array.isArray(base)
    ? { ...(base as Record<string, unknown>) }
    : {};
  for (const [key, value] of Object.entries(named)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Pagination params shared by the two search actions. */
export const PAGING_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Results per page. Default 10, maximum 100. Each result returned costs 0.25 credit.",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    hint: "Results to skip. Maximum 10,000 — use Search After to go deeper.",
    validation: { min: 0, max: 10000, integer: true },
  },
  {
    key: "searchAfter",
    label: "Search after",
    type: "string",
    hint:
      "Cursor from the previous response's `searchAfter`. Works beyond the 10,000 offset limit.",
  },
];

export function paging(input: { limit?: number; offset?: number; searchAfter?: string }) {
  return {
    limit: input.limit,
    offset: input.offset,
    search_after: input.searchAfter || undefined,
  };
}

export const FILTERS_PARAM: Param = {
  key: "filters",
  label: "Other filters (JSON)",
  type: "json",
  hint:
    'Any other documented filter as a JSON object, e.g. {"current_company_headcounts":[{"min":50,"max":200}]}. Named fields above override the same key here.',
};

/** The `metadata` block both search responses carry. */
export interface SearchMetadata {
  total?: number;
  credits?: number;
  offset?: number;
  search_after?: string;
}
