import { pollToken } from "../../_shared/poll/mod.ts";

/** Rows requested per page. The vendor accepts 1-100 on change feeds. */
export const PAGE_SIZE = 100;

/** Clock seam: tests replace `clock.now`; the seed needs "now" because the feed needs a `since`. */
export const clock = { now: (): number => Date.now() };

interface FeedPage<T> {
  changes: T[];
  hasMore: boolean;
  asOf?: string;
}

interface Position {
  /** `since` for the window being read. */
  since: string;
  /** The first page's `asOf`, pinned while a window spans several pages. */
  asOf?: string;
  /** Rows of this window already emitted. */
  offset: number;
}

function parse(token: string): Position {
  return JSON.parse(token) as Position;
}

/**
 * Drives a Ninox change feed (`since` in, `meta.asOf` out, oldest first).
 *
 * - Seed: record `since = now` and read nothing, so changes made before the first check are never
 *   emitted (no flood).
 * - Each check reads ONE page at the saved `offset`. A window with more rows than one page keeps
 *   `{ since, asOf, offset }` in state and resumes there on the next check (no stall, no repeat);
 *   only a drained window advances `since` to the vendor's `asOf`.
 */
export function pollChangeFeed<T>(
  state: unknown,
  fetchPage: (
    q: { since: string; asOf?: string; limit: number; offset: number },
  ) => FeedPage<T> | Promise<FeedPage<T>>,
) {
  return pollToken<T>({
    state,
    maxEvents: PAGE_SIZE,
    seed: () =>
      Promise.resolve(JSON.stringify({ since: new Date(clock.now()).toISOString(), offset: 0 })),
    async changes(token) {
      const pos = parse(token);
      const page = await fetchPage({
        since: pos.since,
        asOf: pos.offset > 0 ? pos.asOf : undefined,
        limit: PAGE_SIZE,
        offset: pos.offset,
      });
      const asOf = pos.offset > 0 ? pos.asOf : page.asOf;
      const next: Position = page.hasMore
        ? { since: pos.since, asOf, offset: pos.offset + page.changes.length }
        : { since: asOf ?? pos.since, offset: 0 };
      return { items: page.changes, nextToken: JSON.stringify(next) };
    },
  });
}
