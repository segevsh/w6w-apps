/** Newest-first search input shared by the AddEvent search-backed triggers (docs: default sort is `created, desc`; page size caps at 20). */
export const NEWEST_FIRST = {
  sortBy: "created",
  sortOrder: "desc",
  pageSize: 20,
  page: 1,
} as const;

/** The `id` of a raw AddEvent record, as a string. */
export const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

/** Reads `result[field]` as an array (the search endpoints wrap their rows). */
export const rowsOf = (field: string) => (result: unknown): unknown[] => {
  const rows = (result as Record<string, unknown> | null)?.[field];
  return Array.isArray(rows) ? rows : [];
};
