import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import action from "../actions/list-sheets.ts";
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

interface Sheet {
  id: number;
  createdAt?: string;
  modifiedAt?: string;
}

const PAGE_SIZE = 100;

const OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Sheet ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "accessLevel", type: "string", label: "Access level" },
  { key: "permalink", type: "string", label: "Permalink" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "modifiedAt", type: "string", label: "Modified at" },
];

function sample(modifiedAt: string) {
  return {
    id: 4583173393803140,
    name: "Project plan",
    accessLevel: "OWNER",
    permalink: "https://app.smartsheet.com/sheets/abc123",
    createdAt: "2026-11-09T09:00:00Z",
    modifiedAt,
  };
}

/**
 * `GET /sheets?modifiedSince=<iso>&page=<n>&pageSize=100` — Smartsheet documents `modifiedSince`
 * ("only sheets modified on or after this instant") and no sort, so "new" is `modifiedSince` plus
 * a `createdAt` check on each abbreviated sheet. Pages are 1-based; a longer window is resumed from
 * the saved page number.
 */
async function fetchSince(
  sinceIso: string,
  pos: Pos | undefined,
  ctx: HookContext,
): Promise<{ items: Sheet[]; next?: Pos }> {
  const page = typeof pos === "number" ? pos : 1;
  const res = await action.execute!(
    { modifiedSince: sinceIso, page, pageSize: PAGE_SIZE },
    ctx,
  ) as { data?: Sheet[]; totalPages?: number };
  return { items: res.data ?? [], next: page < (res.totalPages ?? 0) ? page + 1 : undefined };
}

export const newSheetTrigger: TriggerDefinition = {
  key: "new-sheet",
  title: "New Sheet",
  description: "The run gets each sheet newly created in a place the connected user can access.",
  output: OUTPUT,
  sample: sample("2026-11-09T09:00:00Z"),
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Sheet>({
      state,
      ctx,
      fetch: fetchSince,
      idOf: (s) => String(s.id),
      keep: (s, sinceMs) => Date.parse(s.createdAt ?? "") >= sinceMs,
    });
  },
};

export const newOrUpdatedSheetTrigger: TriggerDefinition = {
  key: "new-or-updated-sheet",
  title: "New or Updated Sheet",
  description: "The run gets each sheet that is created or modified.",
  output: OUTPUT,
  sample: sample("2026-11-09T10:30:00Z"),
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Sheet>({
      state,
      ctx,
      fetch: fetchSince,
      idOf: (s) => `${s.id}:${s.modifiedAt ?? ""}`,
    });
  },
};
