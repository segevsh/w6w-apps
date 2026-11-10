import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import action from "../actions/contact-list.ts";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages read per check. A longer window is resumed on the next check (never re-read from page 1). */
export const MAX_PAGES = 3;
const SEEN_WINDOW = 2000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** A vendor paging position: a page number, an offset or an opaque cursor. */
export type Pos = string | number;

/** The kit's ids envelope plus the since-filter cursor and, mid-window, the resume position. */
export interface WindowState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  /** Epoch ms of the last fully drained check. */
  cursor: number;
  /** Epoch ms of the seed check: a record stamped before it is never emitted (brief §9.9). */
  floor: number;
  resume?: { sinceMs: number; pos: Pos; checkedAt: number };
}

function isSeeded(state: unknown): state is WindowState {
  const s = state as Partial<WindowState> | null;
  return typeof s === "object" && s !== null && s.v === 1 && s.kind === "ids" &&
    s.seeded === true && Array.isArray(s.ids) && typeof s.cursor === "number" &&
    typeof s.floor === "number";
}

/**
 * Since-filter poll (brief §9.1 b + §9.8). Each check reads the window `[cursor - overlap, now]`
 * through the wrapped list action, at most `MAX_PAGES` pages. A window that is not drained is
 * resumed from its saved position on the next check (same `since`), and the cursor only advances
 * to the first check's start once the window is drained. The first check reads nothing: it records
 * the cursor and `floor = now`, and every later check drops a record whose own `stampOf` time is
 * before `floor` (a record with no parseable stamp is kept), so nothing that existed before the
 * seed is ever emitted however many pages the overlap window holds (brief §9.9).
 * Dedupe is by `idOf` through the kit's seen-id window.
 */
export async function pollWindow<T>(o: {
  state: unknown;
  read(
    sinceIso: string,
    pos: Pos | undefined,
    ctx: HookContext,
  ): Promise<{ items: T[]; next?: Pos }>;
  idOf(item: T): string;
  /** Client-side filter for records the vendor can only select by modification time. */
  keep?(item: T, sinceMs: number): boolean;
  /** The record's own creation (new-*) or update (new-or-updated-*) stamp, for the seed floor. */
  stampOf(item: T): string | undefined;
  ctx: HookContext;
}): Promise<{ events: T[]; nextState: WindowState }> {
  const checkedAt = clock.now();
  const prior = isSeeded(o.state) ? o.state : undefined;
  const gathered: T[] = [];
  let next: Pos | undefined;
  let sinceMs = checkedAt;
  if (prior) {
    sinceMs = prior.resume?.sinceMs ?? prior.cursor - OVERLAP_MS;
    let pos = prior.resume?.pos;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await o.read(new Date(sinceMs).toISOString(), pos, o.ctx);
      for (const item of res.items) {
        const at = Date.parse(o.stampOf(item) ?? "");
        if (at < prior.floor) continue;
        if (!o.keep || o.keep(item, sinceMs)) gathered.push(item);
      }
      next = res.next;
      if (next === undefined) break;
      pos = next;
    }
  }
  const { events, nextState } = await pollNewItems<T>({
    state: prior ?? {},
    fetchPage: () => Promise.resolve({ items: gathered }),
    idOf: o.idOf,
    maxPages: 1,
    maxEvents: Number.POSITIVE_INFINITY,
    seenWindow: SEEN_WINDOW,
  });
  const windowStart = prior?.resume?.checkedAt ?? checkedAt;
  const state: WindowState = {
    ...nextState,
    cursor: !prior || next === undefined ? windowStart : prior.cursor,
    floor: prior?.floor ?? checkedAt,
  };
  if (prior && next !== undefined) state.resume = { sinceMs, pos: next, checkedAt: windowStart };
  return { events, nextState: state };
}

interface Contact {
  id: number;
  created_at?: string;
  updated_at?: string;
}

const PAGE_SIZE = 100;
const DAY_MS = 86_400_000;

const OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Contact ID" },
  { key: "email", type: "string", label: "Email" },
  { key: "first_names", type: "string", label: "First names" },
  { key: "last_name", type: "string", label: "Last name" },
  { key: "created_at", type: "string", label: "Created" },
  { key: "updated_at", type: "string", label: "Updated" },
];

function sample(updatedAt: string) {
  return {
    id: 4815162342,
    email: "ada@example.com",
    first_names: "Ada",
    last_name: "Lovelace",
    created_at: "2026-11-09T09:00:00.000Z",
    updated_at: updatedAt,
  };
}

const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * `GET /api/v2/customers` (the `contact-list` action) with the vendor's `created_at` /
 * `updated_at` DateFilter `{ preset: "custom", from, to }`. The filter is date-granular and its time
 * zone is not documented, so the window is widened by a day on each side and the records are then
 * cut to the real window by their own stamps. Paging uses `after`, which the vendor documents as
 * "ordered by id" ascending, so the resume position is the last id read and a window is stable
 * while it is being drained.
 */
function fetchSince(field: "created" | "updated") {
  return async (
    sinceIso: string,
    pos: Pos | undefined,
    ctx: HookContext,
  ): Promise<{ items: Contact[]; next?: Pos }> => {
    const from = day(Date.parse(sinceIso) - DAY_MS);
    const to = day(clock.now() + DAY_MS);
    const res = await action.execute!(
      {
        [`${field}From`]: from,
        [`${field}To`]: to,
        perPage: PAGE_SIZE,
        after: typeof pos === "number" ? pos : 0,
      },
      ctx,
    ) as { items?: Contact[]; hasMore?: boolean; nextAfter?: number | null };
    return {
      items: res.items ?? [],
      next: res.hasMore && typeof res.nextAfter === "number" ? res.nextAfter : undefined,
    };
  };
}

const before = (stamp: string | undefined, ms: number) => Date.parse(stamp ?? "") < ms;

export const newContactTrigger: TriggerDefinition = {
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly added to the Simplero account.",
  output: OUTPUT,
  sample: sample("2026-11-09T09:00:00.000Z"),
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Contact>({
      state,
      ctx,
      read: fetchSince("created"),
      stampOf: (c) => c.created_at,
      idOf: (c) => String(c.id),
      keep: (c, sinceMs) => !before(c.created_at, sinceMs),
    });
  },
};

export const newOrUpdatedContactTrigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each contact that is added or updated.",
  output: OUTPUT,
  sample: sample("2026-11-09T10:30:00.000Z"),
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Contact>({
      state,
      ctx,
      read: fetchSince("updated"),
      stampOf: (c) => c.updated_at,
      idOf: (c) => `${c.id}:${c.updated_at ?? ""}`,
      keep: (c, sinceMs) => !before(c.updated_at, sinceMs),
    });
  },
};
