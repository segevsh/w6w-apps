/** Shared helpers for the bexio poll triggers. */

/** bexio list endpoints answer with a bare JSON array. */
export const rows = (result: unknown): unknown[] => Array.isArray(result) ? result : [];

/** bexio record id as the dedupe key. */
export const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

/** Id plus the `updated_at` stamp, so an edit is a new event. */
export const idAndUpdated = (item: unknown): string =>
  `${idOf(item)}:${(item as { updated_at?: unknown }).updated_at ?? ""}`;
