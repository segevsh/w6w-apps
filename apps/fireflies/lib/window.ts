import { pollNewItems } from "../../_shared/poll/mod.ts";

type Pos = string | number;

interface Resume {
  since: number;
  started: number;
  pos: Pos;
  /** Ids of the drain's first (newest) batch, re-pinned into the seen window when it ends. */
  head: string[];
}

const asMs = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? undefined : parsed;
};

function resumeOf(value: unknown): Resume | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  const pos = r.pos;
  if (typeof r.since !== "number" || typeof r.started !== "number") return undefined;
  if (typeof pos !== "string" && typeof pos !== "number") return undefined;
  const head = Array.isArray(r.head) ? r.head.map(String) : [];
  return { since: r.since, started: r.started, pos, head };
}

/**
 * Since-filter polling that cannot stall (brief 9.8). One check reads `since = cursor - overlap`
 * for at most `maxPages` pages. If the window holds more, the next page position is persisted in
 * `state.resume` (with the window's `since`) and the following check continues from it; the cursor
 * moves only when a read reaches the last page, and then to the moment the window STARTED, so
 * anything created while it drained is read by the next window. Ids are marked seen only when
 * emitted (kit rule), so nothing is emitted twice; the newest batch is re-pinned in the seen window
 * when a multi-check drain ends so the next window's overlap cannot re-emit it.
 */
export async function pollWindow<T, P extends Pos>(o: {
  state: unknown;
  now: number;
  overlapMs: number;
  maxPages: number;
  pageSize: number;
  seenWindow: number;
  idOf(item: T): string;
  load(since: number, pos: P | undefined): Promise<{ items: T[]; next?: P }>;
}): Promise<{ events: T[]; nextState: Record<string, unknown> }> {
  const s = (o.state && typeof o.state === "object" ? o.state : {}) as Record<string, unknown>;
  const seeded = s.v === 1 && s.kind === "ids" && s.seeded === true && Array.isArray(s.ids);
  const cursor = asMs(s.cursor) ?? o.now;
  const resume = seeded ? resumeOf(s.resume) : undefined;
  const since = resume ? resume.since : cursor - o.overlapMs;

  const items: T[] = [];
  let pos = resume?.pos as P | undefined;
  let more = false;
  for (let page = 0; page < (seeded ? o.maxPages : 1); page++) {
    const res = await o.load(since, pos);
    items.push(...res.items);
    pos = res.items.length > 0 ? res.next : undefined;
    more = pos !== undefined;
    if (!more) break;
  }

  const polled = await pollNewItems<T>({
    state: o.state,
    maxPages: 1,
    maxEvents: Math.max(1, items.length),
    seenWindow: o.seenWindow,
    idOf: o.idOf,
    fetchPage: () => Promise.resolve({ items }),
  });
  if (!seeded) return { events: polled.events, nextState: { ...polled.nextState, cursor: o.now } };

  if (more) {
    const head = resume ? resume.head : items.map(o.idOf).slice(0, o.maxPages * o.pageSize);
    return {
      events: polled.events,
      nextState: {
        ...polled.nextState,
        cursor,
        resume: { since, started: resume?.started ?? o.now, pos, head },
      },
    };
  }
  const head = resume?.head ?? [];
  const ids = head.length === 0
    ? polled.nextState.ids
    : [...polled.nextState.ids.filter((id) => !head.includes(id)), ...head].slice(-o.seenWindow);
  return {
    events: polled.events,
    nextState: { ...polled.nextState, ids, cursor: resume?.started ?? o.now },
  };
}
