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
  contactId: string;
  created?: string;
  updated?: string;
}

const PAGE_SIZE = 100;

const OUTPUT: OutputField[] = [
  { key: "contactId", type: "string", label: "Contact ID" },
  { key: "contactPhone", type: "string", label: "Phone number" },
  { key: "firstName", type: "string", label: "First name" },
  { key: "lastName", type: "string", label: "Last name" },
  { key: "email", type: "string", label: "Email" },
  { key: "subscriptionStatus", type: "string", label: "Subscription status" },
  { key: "created", type: "string", label: "Created" },
  { key: "updated", type: "string", label: "Updated" },
];

function sample(updated: string) {
  return {
    contactId: "607f0558a7c898629dd47d7a",
    contactPhone: "1234567890",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    subscriptionStatus: "OPT_IN",
    created: "2026-11-09T09:00:00.000Z",
    updated,
  };
}

/**
 * `GET /api/contacts?page=<n>&size=100&since=<iso>&direction=desc` — the vendor sorts by `updated`
 * (default descending), not by creation, and filters by `since` ("List contacts updated since a
 * specified date"). So "new" is `since` plus a `created` check on each row. Pages are 0-based; a
 * window with more pages is resumed from the saved page number.
 */
async function fetchSince(
  sinceIso: string,
  pos: Pos | undefined,
  ctx: HookContext,
): Promise<{ items: Contact[]; next?: Pos }> {
  const page = typeof pos === "number" ? pos : 0;
  const res = await action.execute!(
    { page, size: PAGE_SIZE, since: sinceIso, direction: "desc" },
    ctx,
  ) as { content?: Contact[]; totalPages?: number };
  return {
    items: res.content ?? [],
    next: page + 1 < (res.totalPages ?? 0) ? page + 1 : undefined,
  };
}

export const newContactTrigger: TriggerDefinition = {
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly added to the account.",
  output: OUTPUT,
  sample: sample("2026-11-09T09:00:00.000Z"),
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Contact>({
      state,
      ctx,
      read: fetchSince,
      stampOf: (c) => c.created,
      idOf: (c) => String(c.contactId),
      keep: (c, sinceMs) => Date.parse(c.created ?? "") >= sinceMs,
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
      read: fetchSince,
      stampOf: (c) => c.updated,
      idOf: (c) => `${c.contactId}:${c.updated ?? ""}`,
    });
  },
};
