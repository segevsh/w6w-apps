/**
 * Since-filter poll window (brief §9.1 (b), §9.8, §9.9). Pure: no HTTP, no clock — the caller
 * passes `now` and a `fetchPage` that wraps the app's own list action.
 *
 * - Seed (state is not this envelope): stores `floor = now` and `cursor = now`, reads nothing and
 *   emits nothing. Any item whose own timestamp is `< floor` is dropped on every later check, so a
 *   record that existed before the seed can never be emitted, however many pages the window holds
 *   (an item with no parseable timestamp is kept).
 * - A check reads `since = max(cursor - overlap, floor)` up to `maxPages` pages. If the window is
 *   not drained, `resume = { since, next, pos }` is persisted and the NEXT check continues from
 *   there; `cursor` only advances (to `next`, the time the window was opened) once a page reports
 *   `more: false`. Resuming backs `pos` up by `backup` rows and relies on the id dedupe, so an
 *   edit that shifts rows between checks repeats a few rows rather than skipping any.
 * - When one fetch returns more unseen items than `maxEvents` (a source with no paging), the oldest
 *   `maxEvents` are emitted and the window resumes from the last emitted timestamp; the caller
 *   must return such items oldest-first. A paged caller keeps `maxPages * pageSize <= maxEvents`.
 */
export interface WindowState {
  v: 1;
  kind: "ids";
  seeded: true;
  /** Emitted ids, oldest first, capped at `seenWindow` (FIFO). */
  ids: string[];
  /** Epoch ms of the seed. */
  floor: number;
  /** Epoch ms the last fully drained window was opened at. */
  cursor: number;
  /** Present while a window is only partly read. */
  resume?: { since: number; next: number; pos: number };
}

export interface WindowOptions<T> {
  state: unknown;
  now: number;
  overlapMs: number;
  /** Rounds the seed floor down to the vendor's timestamp resolution (default 1 ms). */
  floorGranularityMs?: number;
  /** First page position (0-based offset or 1-based page) and the step between pages (0: unpaged). */
  firstPos: number;
  step: number;
  /** Rows to re-read when resuming a partly read window (the dedupe absorbs them). */
  backup?: number;
  maxPages: number;
  maxEvents: number;
  seenWindow: number;
  fetchPage(sinceMs: number, pos: number): Promise<{ items: T[]; more: boolean }>;
  idOf(item: T): string;
  /** The item's creation (or update) time in epoch ms, `undefined` if it has none. */
  stampOf(item: T): number | undefined;
}

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function readState(state: unknown): WindowState | null {
  if (typeof state !== "object" || state === null) return null;
  const s = state as Record<string, unknown>;
  if (s.v !== 1 || s.kind !== "ids" || s.seeded !== true) return null;
  if (!Array.isArray(s.ids) || !finite(s.floor) || !finite(s.cursor)) return null;
  const r = s.resume as Record<string, unknown> | undefined;
  const resume = r && finite(r.since) && finite(r.next) && finite(r.pos)
    ? { since: r.since, next: r.next, pos: r.pos }
    : undefined;
  return {
    v: 1,
    kind: "ids",
    seeded: true,
    ids: s.ids.map(String),
    floor: s.floor,
    cursor: s.cursor,
    ...(resume ? { resume } : {}),
  };
}

export async function pollSinceWindow<T>(
  o: WindowOptions<T>,
): Promise<{ events: T[]; nextState: WindowState }> {
  const prior = readState(o.state);
  if (!prior) {
    const g = o.floorGranularityMs ?? 1;
    return {
      events: [],
      nextState: {
        v: 1,
        kind: "ids",
        seeded: true,
        ids: [],
        floor: o.now - (o.now % g),
        cursor: o.now,
      },
    };
  }

  const { resume } = prior;
  const since = Math.max(resume ? resume.since : prior.cursor - o.overlapMs, prior.floor);
  const next = resume ? resume.next : o.now;
  let pos = resume ? Math.max(o.firstPos, resume.pos - (o.backup ?? 0)) : o.firstPos;
  const seen = new Set(prior.ids);
  const queued = new Set<string>();
  const unseen: T[] = [];
  let drained = false;
  for (let i = 0; i < o.maxPages; i++) {
    const res = await o.fetchPage(since, pos);
    for (const item of res.items) {
      const stamp = o.stampOf(item);
      if (stamp !== undefined && stamp < prior.floor) continue;
      const id = o.idOf(item);
      if (seen.has(id) || queued.has(id)) continue;
      queued.add(id);
      unseen.push(item);
    }
    if (!res.more) {
      drained = true;
      break;
    }
    pos += o.step;
  }

  const events = unseen.slice(0, o.maxEvents);
  const trimmed = unseen.length > events.length;
  const ids = [...prior.ids, ...events.map((e) => o.idOf(e))].slice(-o.seenWindow);
  const base = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids,
    floor: prior.floor,
  };
  if (drained && !trimmed) return { events, nextState: { ...base, cursor: next } };
  const last = trimmed ? o.stampOf(events[events.length - 1]) : undefined;
  return {
    events,
    nextState: {
      ...base,
      cursor: prior.cursor,
      resume: trimmed ? { since: last ?? since, next, pos: o.firstPos } : { since, next, pos },
    },
  };
}
