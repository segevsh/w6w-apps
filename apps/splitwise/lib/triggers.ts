import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import action from "../actions/list-expenses.ts";
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
  resume?: { sinceMs: number; pos: Pos; checkedAt: number };
}

function isSeeded(state: unknown): state is WindowState {
  const s = state as Partial<WindowState> | null;
  return typeof s === "object" && s !== null && s.v === 1 && s.kind === "ids" &&
    s.seeded === true && Array.isArray(s.ids) && typeof s.cursor === "number";
}

/**
 * Since-filter poll (brief §9.1 b + §9.8). Each check reads the window `[cursor - overlap, now]`
 * through the wrapped list action, at most `MAX_PAGES` pages. A window that is not drained is
 * resumed from its saved position on the next check (same `since`), and the cursor only advances
 * to the first check's start once the window is drained. The first check only records the cursor.
 * Dedupe is by `idOf` through the kit's seen-id window.
 */
export async function pollWindow<T>(o: {
  state: unknown;
  fetch(
    sinceIso: string,
    pos: Pos | undefined,
    ctx: HookContext,
  ): Promise<{ items: T[]; next?: Pos }>;
  idOf(item: T): string;
  /** Client-side filter for records the vendor can only select by modification time. */
  keep?(item: T, sinceMs: number): boolean;
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
      const res = await o.fetch(new Date(sinceMs).toISOString(), pos, o.ctx);
      for (const item of res.items) if (!o.keep || o.keep(item, sinceMs)) gathered.push(item);
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
  };
  if (prior && next !== undefined) state.resume = { sinceMs, pos: next, checkedAt: windowStart };
  return { events, nextState: state };
}

interface Expense {
  id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface Params {
  group_id?: number;
  friend_id?: number;
}

const PAGE_SIZE = 100;
const PARAMS = (action.params ?? []).filter((p) => p.key === "group_id" || p.key === "friend_id");

const OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Expense ID" },
  { key: "description", type: "string", label: "Description" },
  { key: "cost", type: "string", label: "Total cost" },
  { key: "currency_code", type: "string", label: "Currency" },
  { key: "group_id", type: "number", label: "Group ID" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
  { key: "deleted_at", type: "string", label: "Deleted at (null unless deleted)" },
];

function sample(updatedAt: string) {
  return {
    id: 1234567,
    description: "Groceries",
    cost: "42.50",
    currency_code: "USD",
    group_id: 0,
    created_at: "2026-11-09T09:00:00Z",
    updated_at: updatedAt,
    deleted_at: null,
  };
}

/**
 * `GET /get_expenses?updated_after=…&limit=100&offset=…` — Splitwise documents `updated_after` but
 * no sort order, and no created-time filter, so "new" is `updated_after` plus a `created_at` check
 * on each row. Paging is offset-based: a full page means another may follow.
 */
async function fetchSince(
  sinceIso: string,
  pos: Pos | undefined,
  ctx: HookContext,
  params: Params,
): Promise<{ items: Expense[]; next?: Pos }> {
  const offset = typeof pos === "number" ? pos : 0;
  const res = await action.execute!(
    { ...params, updated_after: sinceIso, limit: PAGE_SIZE, offset },
    ctx,
  ) as { expenses?: Expense[] };
  const items = res.expenses ?? [];
  return { items, next: items.length >= PAGE_SIZE ? offset + PAGE_SIZE : undefined };
}

export const newExpenseTrigger: TriggerDefinition<Params> = {
  key: "new-expense",
  title: "New Expense",
  description: "The run gets each expense newly added to the account (deleted ones are skipped).",
  params: PARAMS,
  output: OUTPUT,
  sample: sample("2026-11-09T09:00:00Z"),
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return pollWindow<Expense>({
      state,
      ctx,
      fetch: (since, pos, c) => fetchSince(since, pos, c, params),
      idOf: (e) => String(e.id),
      keep: (e, sinceMs) => !e.deleted_at && Date.parse(e.created_at ?? "") >= sinceMs,
    });
  },
};

export const newOrUpdatedExpenseTrigger: TriggerDefinition<Params> = {
  key: "new-or-updated-expense",
  title: "New or Updated Expense",
  description: "The run gets each expense that is added, edited or deleted.",
  params: PARAMS,
  output: OUTPUT,
  sample: sample("2026-11-09T10:30:00Z"),
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return pollWindow<Expense>({
      state,
      ctx,
      fetch: (since, pos, c) => fetchSince(since, pos, c, params),
      idOf: (e) => `${e.id}:${e.updated_at ?? ""}`,
    });
  },
};
