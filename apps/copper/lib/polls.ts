import type { HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import searchActivities from "../actions/search-activities.ts";
import listUsers from "../actions/list-users.ts";
import listRelatedItems from "../actions/list-related-items.ts";
import type { SearchResult } from "./client.ts";

/** Copper's documented page-size ceiling for `/search` calls. */
const PAGE_SIZE = 200;

type Rec = Record<string, unknown>;

function asRec(v: unknown): Rec | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? v as Rec : null;
}

function idString(v: unknown): string | null {
  return typeof v === "number" && Number.isFinite(v)
    ? String(v)
    : typeof v === "string" && v !== ""
    ? v
    : null;
}

// ---------------------------------------------------------------------------------------------
// New Activity: since-filter poll over `search-activities` (`minimum_activity_date`).
// https://developer.copper.com/activities/list-activities-search.html (verified 2026-11-10):
// the search takes an activity-date window but documents no sort order, so pages are not
// newest-first; every check re-reads the window and dedupes by activity id.
// ---------------------------------------------------------------------------------------------

export const ACTIVITY_OVERLAP_SEC = 120;
export const ACTIVITY_MAX_PAGES = 3;
export const ACTIVITY_MAX_EVENTS = 100;
export const ACTIVITY_SEEN_CAP = 1000;

export interface ActivityState {
  v: 1;
  kind: "since";
  seeded: true;
  /** Seed time (ms): activities created before it are never emitted (no flood after the seed). */
  floor: number;
  /** Lower bound (Unix seconds) of the window being read. */
  since: number;
  /** Time (ms) this window's drain started; becomes the next `since`. Null between windows. */
  windowEnd: number | null;
  /** Next page of the window to read (resume position, so a long window cannot stall). */
  page: number;
  /** Activity ids already emitted (FIFO, capped). */
  seen: string[];
}

function activityState(v: unknown): ActivityState | null {
  const s = asRec(v);
  if (
    !s || s.v !== 1 || s.kind !== "since" || s.seeded !== true || typeof s.floor !== "number" ||
    typeof s.since !== "number" || typeof s.page !== "number" || !Array.isArray(s.seen)
  ) return null;
  return {
    v: 1,
    kind: "since",
    seeded: true,
    floor: s.floor,
    since: s.since,
    windowEnd: typeof s.windowEnd === "number" ? s.windowEnd : null,
    page: Math.max(1, Math.floor(s.page)),
    seen: s.seen.filter((x): x is string => typeof x === "string"),
  };
}

const createdSec = (r: Rec): number => typeof r.date_created === "number" ? r.date_created : NaN;

export async function pollNewActivities(
  stateIn: unknown,
  ctx: HookContext,
  now: number = Date.now(),
): Promise<{ events: unknown[]; nextState: ActivityState }> {
  const state = activityState(stateIn);
  if (!state) {
    return {
      events: [],
      nextState: {
        v: 1,
        kind: "since",
        seeded: true,
        floor: now,
        since: Math.floor(now / 1000),
        windowEnd: null,
        page: 1,
        seen: [],
      },
    };
  }
  const windowEnd = state.windowEnd ?? now;
  const seen = new Set(state.seen);
  const fresh = new Map<string, Rec>();
  let page = state.page;
  let drained = false;
  for (let n = 0; n < ACTIVITY_MAX_PAGES; n++) {
    const res = await searchActivities.execute({
      minimumActivityDate: state.since - ACTIVITY_OVERLAP_SEC,
      pageNumber: page,
      pageSize: PAGE_SIZE,
    }, ctx) as SearchResult;
    const records = Array.isArray(res?.records) ? res.records : [];
    for (const item of records) {
      const r = asRec(item);
      const id = r ? idString(r.id) : null;
      if (!r || !id || seen.has(id)) continue;
      const created = createdSec(r);
      if (!Number.isNaN(created) && created * 1000 < state.floor) continue;
      fresh.set(id, r);
    }
    if (records.length < PAGE_SIZE) {
      drained = true;
      break;
    }
    page++;
  }
  const ordered = [...fresh.entries()].sort((a, b) => {
    const ca = createdSec(a[1]);
    const cb = createdSec(b[1]);
    const d = (Number.isNaN(ca) ? 0 : ca) - (Number.isNaN(cb) ? 0 : cb);
    return d !== 0 ? d : Number(a[0]) - Number(b[0]);
  });
  const capped = ordered.length > ACTIVITY_MAX_EVENTS;
  const emitted = ordered.slice(0, ACTIVITY_MAX_EVENTS);
  const nextSeen = [...state.seen, ...emitted.map(([id]) => id)].slice(-ACTIVITY_SEEN_CAP);
  const base = { v: 1 as const, kind: "since" as const, seeded: true as const, floor: state.floor };
  let nextState: ActivityState;
  if (capped) {
    // More unseen than one check may emit: re-read from the same page; emitted ids are now seen.
    nextState = { ...base, since: state.since, windowEnd, page: state.page, seen: nextSeen };
  } else if (drained) {
    nextState = {
      ...base,
      since: Math.floor(windowEnd / 1000),
      windowEnd: null,
      page: 1,
      seen: nextSeen,
    };
  } else {
    nextState = { ...base, since: state.since, windowEnd, page, seen: nextSeen };
  }
  return { events: emitted.map(([, r]) => r), nextState };
}

// ---------------------------------------------------------------------------------------------
// New User: bounded snapshot of `list-users` (an account's team members; up to 5000 rows).
// https://developer.copper.com/account-and-users/list-users.html (verified 2026-11-10)
// ---------------------------------------------------------------------------------------------

const USER_MAX_PAGES = 25;

export async function pollNewUsers(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, Rec>();
  for (let page = 1; page <= USER_MAX_PAGES; page++) {
    const res = await listUsers.execute(
      { pageNumber: page, pageSize: PAGE_SIZE },
      ctx,
    ) as SearchResult;
    const records = Array.isArray(res?.records) ? res.records : [];
    for (const item of records) {
      const r = asRec(item);
      const id = r ? idString(r.id) : null;
      if (!r || !id) throw new Error("Copper returned a user without an id");
      byId.set(id, r);
    }
    if (records.length < PAGE_SIZE) break;
  }
  const { events, nextState } = await pollSnapshot({
    state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}

// ---------------------------------------------------------------------------------------------
// New Related Item: bounded snapshot of `list-related-items` for one record the user names.
// https://developer.copper.com/related-items/view-all-records-related-to-an-entity.html
// (verified 2026-11-10): `GET /{entity}/{id}/related/` returns `[{id, type}]` for that record.
// ---------------------------------------------------------------------------------------------

export interface RelatedParams {
  entity: string;
  entityId: string;
  relatedEntity?: string;
}

export async function pollNewRelatedItems(
  state: unknown,
  params: RelatedParams,
  ctx: HookContext,
): Promise<{ events: unknown[]; nextState: unknown }> {
  const res = await listRelatedItems.execute({
    entity: params.entity,
    entityId: params.entityId,
    relatedEntity: params.relatedEntity || undefined,
  }, ctx) as { items?: unknown[] };
  const byKey = new Map<string, Rec>();
  for (const item of Array.isArray(res?.items) ? res.items : []) {
    const r = asRec(item);
    const id = r ? idString(r.id) : null;
    const type = r && typeof r.type === "string" ? r.type : null;
    if (!r || !id || !type) throw new Error("Copper returned a related item without an id or type");
    byKey.set(`${type}:${id}`, r);
  }
  const { events, nextState } = await pollSnapshot({
    state,
    rows: [...byKey.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byKey.get(e.key)), nextState };
}
