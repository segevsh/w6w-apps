import type { HookContext } from "@w6w/types";
import { pollWindow } from "./window.ts";

/** Look-back before the stored cursor, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 50;
/** Pages one check reads; a bigger window resumes next check (brief 9.8). */
export const MAX_PAGES = 5;

/** Paystack stamps `createdAt` as ISO 8601 UTC (`2016-09-21T14:08:41.000Z`). */
export function stampMs(stamp: unknown): number | undefined {
  if (typeof stamp !== "string") return undefined;
  const t = Date.parse(stamp);
  return Number.isNaN(t) ? undefined : t;
}

/**
 * Since-filter polling with `from`/`to`. Continuation pages add `to = window start`, so records
 * created while the window drains cannot shift a page number; the next window reads them.
 */
export function checkSince<T>(o: {
  state: unknown;
  list(from: string, page: number, to?: string): Promise<unknown[]>;
  idOf(item: T): string;
  stampOf(item: T): unknown;
  ctx: HookContext;
}) {
  return pollWindow<T, number>({
    state: o.state,
    now: Date.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: o.idOf,
    tsOf: (item) => stampMs(o.stampOf(item)),
    async load(since, page, until) {
      const items = (await o.list(
        new Date(since).toISOString(),
        page ?? 1,
        page === undefined ? undefined : new Date(until).toISOString(),
      )) as T[];
      return { items, next: items.length >= PAGE_SIZE ? (page ?? 1) + 1 : undefined };
    },
  });
}
