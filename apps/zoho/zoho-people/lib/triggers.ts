import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import action from "../actions/record-list.ts";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";

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

interface PeopleRecord {
  recordId: string;
  ModifiedTime?: string | number;
}

const PAGE = 200;

/** `ModifiedTime` is epoch milliseconds (a string in the docs' sample response). */
const modifiedIso = (r: PeopleRecord): string | undefined => {
  const ms = Number(r.ModifiedTime);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : undefined;
};

/**
 * `GET /forms/<formLinkName>/getRecords` documents `sIndex` (1-based), `limit` (max 200) and
 * `modifiedtime`: "To fetch records added & modified after the given time. value should be
 * timestamp in milliseconds". A window is paged with `sIndex`; a full page means there may be more.
 */
function fetchSince(formLinkName: string) {
  return async (
    sinceIso: string,
    pos: Pos | undefined,
    ctx: HookContext,
  ): Promise<{ items: PeopleRecord[]; next?: Pos }> => {
    const sIndex = typeof pos === "number" ? pos : 1;
    const res = await action.execute!(
      { formLinkName, sIndex, limit: PAGE, modifiedtime: Date.parse(sinceIso) },
      ctx,
    ) as { records?: PeopleRecord[] };
    const items = res.records ?? [];
    return { items, next: items.length >= PAGE ? sIndex + PAGE : undefined };
  };
}

export const newOrUpdatedRecordTrigger: TriggerDefinition = {
  key: "new-or-updated-record",
  title: "New or Updated Record",
  description: "The run gets each record of the chosen form that is added or modified.",
  params: [{
    key: "formLinkName",
    label: "Form link name",
    type: "string",
    required: true,
    placeholder: "employee",
    hint: "The form to watch, from List Forms.",
  }],
  output: [
    { key: "recordId", type: "string", label: "Record ID" },
    { key: "Zoho_ID", type: "string", label: "Zoho ID" },
    { key: "AddedTime", type: "string", label: "Added time" },
    { key: "ModifiedTime", type: "string", label: "Modified time (epoch ms)" },
    { key: "ModifiedBy", type: "string", label: "Modified by" },
  ],
  sample: {
    recordId: "759415000001155233",
    Zoho_ID: "759415000001155233",
    FirstName: "John",
    LastName: "Doe",
    AddedTime: "22-Jan-2025 09:03:41",
    ModifiedTime: "1744977447648",
    ModifiedBy: "Jane Doe",
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    const formLinkName = String((params as { formLinkName?: string }).formLinkName ?? "");
    if (!formLinkName) throw new Error("`formLinkName` is required.");
    return pollWindow<PeopleRecord>({
      state,
      ctx,
      read: fetchSince(formLinkName),
      stampOf: modifiedIso,
      idOf: (r) => `${r.recordId}:${r.ModifiedTime ?? ""}`,
    });
  },
};

/** The most rows the time-tracker list actions return in one request (`limit` max, see people.ts). */
export const SNAPSHOT_LIMIT = 200;

/**
 * Bounded-collection poll (brief 9.1 c) over one list action request: the whole collection is read
 * in a single request of `SNAPSHOT_LIMIT` rows, the ids are diffed with `pollSnapshot` and only the
 * added ones are emitted. A full page means there may be more rows than one request can read, so
 * it throws a clear error rather than silently watching a truncated list. The first check seeds
 * and emits nothing.
 */
export function snapshotTrigger<P>(spec: {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  read(params: P, ctx: HookContext): Promise<Array<Record<string, unknown>>>;
  idOf(item: Record<string, unknown>): string;
}): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const rows = await spec.read(params, ctx);
      if (rows.length >= SNAPSHOT_LIMIT) {
        throw new Error(
          `${spec.key}: ${SNAPSHOT_LIMIT} or more rows came back; too many to watch with one request`,
        );
      }
      const byId = new Map<string, Record<string, unknown>>();
      for (const r of rows) byId.set(spec.idOf(r), r);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key) as Record<string, unknown>), nextState };
    },
  };
}
