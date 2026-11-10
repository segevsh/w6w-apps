import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import action from "../actions/list-orders.ts";
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

interface Order {
  id: string;
  createdOn?: string;
  modifiedOn?: string;
}

interface OrderPage {
  pagination?: { hasNextPage?: boolean; nextPageCursor?: string };
  result?: Order[];
}

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Order ID" },
  { key: "orderNumber", type: "string", label: "Order number" },
  { key: "createdOn", type: "string", label: "Created on" },
  { key: "modifiedOn", type: "string", label: "Modified on" },
  { key: "fulfillmentStatus", type: "string", label: "Fulfillment status" },
  { key: "customerEmail", type: "string", label: "Customer email" },
];

function sample(modifiedOn: string) {
  return {
    id: "5f8f4c2e6d1a3b0007a1b2c3",
    orderNumber: "1042",
    createdOn: "2026-11-09T09:00:00.000Z",
    modifiedOn,
    fulfillmentStatus: "PENDING",
    customerEmail: "buyer@example.com",
  };
}

/**
 * `GET /1.0/commerce/orders` — the vendor orders results "by their modification date (modifiedOn)"
 * and documents `modifiedAfter` + `modifiedBefore` (required together, not combinable with
 * `cursor`) and a `nextPageCursor`. So a check opens the window with the modified pair and continues
 * it with the cursor the vendor returns; the resume position is that cursor.
 */
async function fetchSince(
  sinceIso: string,
  pos: Pos | undefined,
  ctx: HookContext,
): Promise<{ items: Order[]; next?: Pos }> {
  const res = await action.execute!(
    typeof pos === "string"
      ? { cursor: pos }
      : { modifiedAfter: sinceIso, modifiedBefore: new Date(clock.now()).toISOString() },
    ctx,
  ) as OrderPage;
  const more = res.pagination?.hasNextPage === true ? res.pagination.nextPageCursor : undefined;
  return { items: res.result ?? [], next: more || undefined };
}

export const newOrderTrigger: TriggerDefinition = {
  key: "new-order",
  title: "New Order",
  description: "The run gets each order newly placed on the site.",
  output: OUTPUT,
  sample: sample("2026-11-09T09:00:00.000Z"),
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Order>({
      state,
      ctx,
      read: fetchSince,
      stampOf: (o) => o.createdOn,
      idOf: (o) => String(o.id),
      keep: (o, sinceMs) => Date.parse(o.createdOn ?? "") >= sinceMs,
    });
  },
};

export const newOrUpdatedOrderTrigger: TriggerDefinition = {
  key: "new-or-updated-order",
  title: "New or Updated Order",
  description: "The run gets each order that is placed or modified.",
  output: OUTPUT,
  sample: sample("2026-11-09T10:30:00.000Z"),
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Order>({
      state,
      ctx,
      read: fetchSince,
      stampOf: (o) => o.modifiedOn,
      idOf: (o) => `${o.id}:${o.modifiedOn ?? ""}`,
    });
  },
};
