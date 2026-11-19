import type { Param } from "@w6w/types";

/**
 * Page-number paging for the list endpoints that accept it.
 *
 * Eventbrite list endpoints all answer with the same `pagination` envelope (`page_number`,
 * `page_size`, `page_count`, `continuation`), but which of `page` and `page_size` an endpoint
 * ACCEPTS differs per endpoint, and an unknown one is a 400 `ARGUMENTS_ERROR`. Each action
 * offers only what its endpoint was measured to accept (live API, 2026-11-19; README §Pagination).
 * The query parameter is `page` — `page_number` exists only in the response and is refused.
 * Page size and Page share the `paging` row, so the editor lays them side by side.
 */

/** Eventbrite caps `page_size` at 200 (a larger value silently returns 200). */
export const MAX_PAGE_SIZE = 200;

export function pageSizeParam(overrides: Partial<Param> = {}): Param {
  return {
    key: "pageSize",
    label: "Page size",
    row: "paging",
    type: "number",
    placeholder: "50",
    hint: `Records per page, 1–${MAX_PAGE_SIZE}. Eventbrite returns 50 when blank.`,
    validation: { min: 1, max: MAX_PAGE_SIZE, integer: true },
    ...overrides,
  };
}

export function pageParam(overrides: Partial<Param> = {}): Param {
  return {
    key: "page",
    label: "Page",
    row: "paging",
    type: "number",
    placeholder: "1",
    hint:
      "Page number to read, starting at 1 (the response's `pagination.page_count` says how many there are). Or leave blank and pass Continuation token from the previous response.",
    validation: { min: 1, integer: true },
    ...overrides,
  };
}

/** A page size for the query: a whole number within 1–200, or omitted. */
export function pageSizeQuery(value: number | string | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.min(n, MAX_PAGE_SIZE);
}

/** A page number for the query: a whole number from 1, or omitted. */
export function pageQuery(value: number | string | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : undefined;
}
