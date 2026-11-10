import type { HookContext } from "@w6w/types";
import payoutList from "../actions/payout-list.ts";
import { pollWindow, toMs } from "./window.ts";

/** Look-back before the previous check. `after` is day-granular, so this is at least a day. */
export const OVERLAP_MS = 2 * 86_400_000;
/** Per-check ceiling: 5 pages (the reference states no page size; it only bounds the seen window). */
export const MAX_PAGES = 5;
export const PAGE_SIZE = 100;
export const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface Payout {
  id: string | null;
  amount?: string;
  currency?: string;
  status?: string;
  created_at?: string;
}

/** `YYYY-MM-DD` (UTC), the only form `after` accepts. */
export function day(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * `GET /v2/payouts?after=YYYY-MM-DD` — "Only return payouts after this date", paged by
 * `page_key`/`next_page_key`, with no documented order (https://gumroad.com/api, verified
 * 2026-11-10), so this is a since-filter window (brief 9.8 resume position, 9.9 seed floor).
 * `include_upcoming=false` drops the not-yet-created payout, whose `id` is null in the reference.
 */
export function checkPayouts(state: unknown, ctx: HookContext) {
  return pollWindow<Payout, string>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf: (p) => String(p.id),
    tsOf: (p) => toMs(p.created_at),
    async load(sinceMs, pos) {
      // One extra day: the reference does not say whether the boundary day is included.
      const res = await payoutList.execute(
        { after: day(sinceMs - 86_400_000), includeUpcoming: false, pageKey: pos },
        ctx,
      ) as { payouts?: Payout[]; nextPageKey?: string | null };
      const read = res.payouts ?? [];
      return {
        items: read.filter((p) => p.id !== null && p.id !== undefined && p.id !== ""),
        next: res.nextPageKey ? res.nextPageKey : undefined,
        read: read.length,
      };
    },
  });
}
