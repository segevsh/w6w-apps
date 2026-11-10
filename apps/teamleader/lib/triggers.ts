import { type IdsState, pollNewItems } from "../../_shared/poll/mod.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export const PAGE_SIZE = 50;
const MAX_PAGES = 2;
const OVERLAP_MS = 300_000;

/** `IdsState` plus the since-filter bookkeeping (brief §9.8 / §9.9). */
export interface WindowState extends IdsState {
  /** Seed time (ms). Items created before it are never emitted (§9.9). */
  floor: number;
  /** Start (ms) of the last fully drained check; the next window starts `OVERLAP_MS` before it. */
  cursor: number;
  /** Set while a window is only partly read: where to continue, and which window it is (§9.8). */
  resume?: { since: number; page: number };
}

function prior(state: unknown): WindowState | null {
  const s = state as Partial<WindowState> | null;
  return s && s.v === 1 && s.kind === "ids" && s.seeded === true && Array.isArray(s.ids) &&
      typeof s.floor === "number" && typeof s.cursor === "number"
    ? (s as WindowState)
    : null;
}

/**
 * Poll one `since`-filtered list. Seed stores `floor = now` and reads nothing. Each later check
 * reads at most `MAX_PAGES` pages of the window `[cursor - overlap, now]` starting at the saved
 * resume page, drops items whose own timestamp is before `floor` (kept when unparseable), dedupes
 * by id and emits the rest. The cursor advances only once a short page shows the window is drained.
 */
export async function pollSinceWindow<T>(o: {
  state: unknown;
  /** One page (1-based) of the list filtered to `since` (ms). Must request `PAGE_SIZE` rows. */
  fetchPage(sinceMs: number, page: number): Promise<T[]>;
  idOf(item: T): string;
  /** The item's own creation (or update) timestamp, any Date-parsable value. */
  timestampOf(item: T): unknown;
}): Promise<{ events: T[]; nextState: WindowState }> {
  const now = clock.now();
  const st = prior(o.state);
  if (!st) {
    return {
      events: [],
      nextState: { v: 1, kind: "ids", seeded: true, ids: [], floor: now, cursor: now },
    };
  }
  const since = st.resume?.since ?? st.cursor - OVERLAP_MS;
  const startPage = st.resume?.page ?? 1;
  let drained = false;
  let nextPage = startPage;
  const window: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const items = await o.fetchPage(since, nextPage);
    nextPage++;
    window.push(...items);
    if (items.length < PAGE_SIZE) {
      drained = true;
      break;
    }
  }
  const fresh = window.filter((item) => {
    const t = Date.parse(String(o.timestampOf(item)));
    return Number.isNaN(t) || t >= st.floor;
  });
  const { events, nextState } = await pollNewItems<T>({
    state: { v: 1, kind: "ids", seeded: true, ids: st.ids },
    fetchPage: () => Promise.resolve({ items: fresh }),
    idOf: o.idOf,
    maxPages: 1,
    maxEvents: PAGE_SIZE * MAX_PAGES,
    seenWindow: 1000,
  });
  const next: WindowState = { ...nextState, floor: st.floor, cursor: drained ? now : st.cursor };
  if (!drained) next.resume = { since, page: nextPage };
  return { events, nextState: next };
}
