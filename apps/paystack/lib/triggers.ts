import type { HookContext } from "@w6w/types";
import { type IdsState, pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the stored cursor, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Most events one check emits. */
export const MAX_EVENTS = 100;
/** Rows requested per page. Never above `MAX_EVENTS`: one page must fit in one check's emission. */
export const PAGE_SIZE = 50;
export const MAX_PAGES = 3;

export interface SinceState extends IdsState {
  /** Latest `createdAt` seen, epoch ms. */
  cursor?: number;
}

/** Paystack stamps `createdAt` as ISO 8601 UTC (`2016-09-21T14:08:41.000Z`). */
export function stampMs(stamp: unknown): number | undefined {
  if (typeof stamp !== "string") return undefined;
  const t = Date.parse(stamp);
  return Number.isNaN(t) ? undefined : t;
}

export async function checkSince<T>(o: {
  state: unknown;
  list(from: string | undefined, page: number): Promise<unknown[]>;
  idOf(item: T): string;
  stampOf(item: T): unknown;
  ctx: HookContext;
}): Promise<{ events: T[]; nextState: SinceState }> {
  const prior = (o.state as { cursor?: unknown } | null)?.cursor;
  const from = typeof prior === "number" ? new Date(prior - OVERLAP_MS).toISOString() : undefined;
  let cursor = typeof prior === "number" ? prior : undefined;
  // A check can read up to MAX_PAGES * PAGE_SIZE rows but emits at most MAX_EVENTS (oldest first).
  // The cursor therefore moves only over what was emitted (or, on the seed, what exists), so rows
  // read but not yet emitted stay inside the next check's `from` window.
  const seeding = cursor === undefined;
  const { events, nextState } = await pollNewItems<T>({
    state: o.state,
    maxPages: MAX_PAGES,
    maxEvents: MAX_EVENTS,
    seenWindow: 200,
    idOf: o.idOf,
    async fetchPage(token) {
      const page = token ? Number(token) : 1;
      const items = (await o.list(from, page)) as T[];
      if (seeding) cursor = newest(items, o.stampOf, cursor);
      return { items, nextPageToken: items.length >= PAGE_SIZE ? String(page + 1) : undefined };
    },
  });
  if (!seeding) cursor = newest(events, o.stampOf, cursor);
  return { events, nextState: cursor === undefined ? nextState : { ...nextState, cursor } };
}

function newest<T>(items: T[], stampOf: (item: T) => unknown, from: number | undefined) {
  let cursor = from;
  for (const item of items) {
    const t = stampMs(stampOf(item));
    if (t !== undefined && (cursor === undefined || t > cursor)) cursor = t;
  }
  return cursor;
}
