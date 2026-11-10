import { pollNewItems } from "../../_shared/poll/mod.ts";

/**
 * Since-filter polling (brief §9.1 b) over a list action whose date filter is DAY-granular and has
 * no sort. The caller widens the request to whole days; this function then keeps only the items
 * whose own stamp lies inside the exact window, so a day's worth of older rows is re-read but never
 * re-emitted and never needs an unbounded seen set.
 *
 * - Unseeded check: stores `floor = now` and reads nothing (§9.9). The window never starts before
 *   `floor`, and any item whose own stamp is before `floor` is dropped, so nothing that existed
 *   before the seed is ever emitted.
 * - Items stamped outside `[since, until]` are dropped (an older one was emitted by an earlier
 *   window, a newer one is read by the next window, whose `since` is `until - OVERLAP_MS`).
 * - Each check reads a bounded slice (<= the kit's 100-event cap) of the window
 *   `[cursor - OVERLAP_MS, until]`. A window with more pages is resumed on the next check from
 *   `resume.pos` with the SAME bounds; `cursor` only advances to `until` once the window drains (§9.8).
 * - Ids are deduped by the kit's `pollNewItems`; `SEEN_WINDOW` covers a whole overlap.
 */
export const OVERLAP_MS = 120_000;
const SEEN_WINDOW = 1000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Resume {
  since: number;
  until: number;
  pos: unknown;
}
interface SinceState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  floor: number;
  cursor: number;
  resume?: Resume;
}

export interface Window {
  /** ISO-8601 lower bound (inclusive of the overlap). */
  since: string;
  /** ISO-8601 upper bound, fixed for the whole drain of this window. */
  until: string;
}

export async function pollSince<T>(o: {
  state: unknown;
  /** One page of the window; `next` is the position of the following page, absent on the last. */
  fetchPage(win: Window, pos: unknown): Promise<{ items: T[]; next?: unknown }>;
  idOf(item: T): string;
  /** The item's own creation stamp in epoch ms; `undefined`/NaN = unparseable (kept, §9.9). */
  stampOf(item: T): number | undefined;
}): Promise<{ events: T[]; nextState: SinceState }> {
  const now = clock.now();
  const s = o.state as Partial<SinceState> | null;
  if (
    !s || s.v !== 1 || s.kind !== "ids" || s.seeded !== true || !Array.isArray(s.ids) ||
    typeof s.floor !== "number" || typeof s.cursor !== "number"
  ) {
    return {
      events: [],
      nextState: { v: 1, kind: "ids", seeded: true, ids: [], floor: now, cursor: now },
    };
  }
  const win: Resume = s.resume ??
    { since: Math.max(s.cursor - OVERLAP_MS, s.floor), until: now, pos: undefined };
  const page = await o.fetchPage(
    { since: new Date(win.since).toISOString(), until: new Date(win.until).toISOString() },
    win.pos,
  );
  const stamp = (i: T) => o.stampOf(i) ?? NaN;
  const fresh = page.items.filter((i) => {
    const t = stamp(i);
    return !(t < s.floor! || t < win.since || t > win.until);
  });
  const newestFirst = [...fresh].sort((a, b) => (stamp(b) || 0) - (stamp(a) || 0));
  const { events, nextState } = await pollNewItems<T>({
    state: { v: 1, kind: "ids", seeded: true, ids: s.ids },
    idOf: o.idOf,
    seenWindow: SEEN_WINDOW,
    maxEvents: 100,
    fetchPage: () => Promise.resolve({ items: newestFirst }),
  });
  const base = { ...nextState, floor: s.floor, cursor: s.cursor };
  return {
    events,
    nextState: page.next === undefined
      ? { ...base, cursor: win.until }
      : { ...base, resume: { since: win.since, until: win.until, pos: page.next } },
  };
}
