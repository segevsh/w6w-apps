/** Shared helpers for the Canny poll triggers (response envelopes and the `id` field). */

/** Pull the array at `key` out of a list response (`posts`, `items`, `tags`, …). */
export const itemsAt = (key: string) => (result: unknown): unknown[] =>
  (result as Record<string, unknown[] | undefined>)[key] ?? [];

/** Canny object id as the dedupe key. */
export const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");
