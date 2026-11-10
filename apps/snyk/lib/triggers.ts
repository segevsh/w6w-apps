import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import action from "../actions/issue-list.ts";
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

interface Issue {
  id: string;
  attributes?: { created_at?: string; updated_at?: string };
}

const PARAMS = (action.params ?? []).filter((p) => p.key === "orgId");

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Issue ID" },
  { key: "type", type: "string", label: "Resource type" },
  {
    key: "attributes",
    type: "object",
    label: "Issue attributes (title, effective_severity_level, status, created_at, updated_at)",
  },
];

/**
 * `GET /rest/orgs/{org_id}/issues` with the vendor's `created_after` / `updated_after` filter
 * (`listOrgIssues`; no sort parameter is documented). `returnAll` makes the action page the whole
 * window itself with `starting_after`, so a window is always drained in one check.
 */
function fetchSince(field: "createdAfter" | "updatedAfter") {
  return async (sinceIso: string, _pos: Pos | undefined, ctx: HookContext, params: Params) => {
    const items = await action.execute!(
      { ...params, returnAll: true, [field]: sinceIso },
      ctx,
    ) as Issue[];
    return { items: Array.isArray(items) ? items : [] };
  };
}

interface Params {
  orgId?: string;
}

export const newIssueTrigger: TriggerDefinition<Params> = {
  key: "new-issue",
  title: "New Issue",
  description: "The run gets each issue Snyk newly finds in the organization.",
  params: PARAMS,
  output: OUTPUT,
  sample: {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    type: "issue",
    attributes: {
      title: "Prototype Pollution",
      effective_severity_level: "high",
      status: "open",
      created_at: "2026-11-09T09:00:00Z",
      updated_at: "2026-11-09T09:00:00Z",
    },
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    const read = fetchSince("createdAfter");
    return pollWindow<Issue>({
      state,
      ctx,
      read: (since, pos, c) => read(since, pos, c, params),
      stampOf: (i) => i.attributes?.created_at,
      idOf: (i) => String(i.id),
    });
  },
};

export const newOrUpdatedIssueTrigger: TriggerDefinition<Params> = {
  key: "new-or-updated-issue",
  title: "New or Updated Issue",
  description: "The run gets each issue that Snyk newly finds or updates in the organization.",
  params: PARAMS,
  output: OUTPUT,
  sample: {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    type: "issue",
    attributes: {
      title: "Prototype Pollution",
      effective_severity_level: "high",
      status: "resolved",
      created_at: "2026-11-08T09:00:00Z",
      updated_at: "2026-11-09T10:30:00Z",
    },
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    const read = fetchSince("updatedAfter");
    return pollWindow<Issue>({
      state,
      ctx,
      read: (since, pos, c) => read(since, pos, c, params),
      stampOf: (i) => i.attributes?.updated_at,
      idOf: (i) => `${i.id}:${i.attributes?.updated_at ?? ""}`,
    });
  },
};

// ---- depth triggers: one per remaining listable record type ----------------------------------

type Json = Record<string, unknown>;
type Execute = (input: unknown, ctx: HookContext) => Promise<unknown>;

export interface WindowSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: Param[];
  /** The wrapped action's since argument: `createdAfter`, `updatedAfter` or `createdGte`. */
  filter: "createdAfter" | "updatedAfter" | "createdGte";
  /** Which attribute the record's own stamp (seed floor) and dedupe come from. */
  stamp: "created_at" | "updated_at";
  output: OutputField[];
  sample: unknown;
}

/**
 * Since-filter trigger over a Snyk list action that takes a created/updated stamp. `returnAll`
 * makes the action page the whole window itself (`starting_after`), so a window is drained in one
 * check; `pollWindow` supplies the cursor, the 9.8 resume position and the 9.9 seed floor.
 */
export function snykWindow(spec: WindowSpec): TriggerDefinition<Json> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ params, state }, ctx) {
      return pollWindow<Issue>({
        state,
        ctx,
        read: async (since, _pos, c) => {
          const items = await (spec.action.execute as Execute)(
            { ...params, returnAll: true, [spec.filter]: since },
            c,
          );
          return { items: Array.isArray(items) ? items as Issue[] : [] };
        },
        stampOf: (i) => i.attributes?.[spec.stamp],
        idOf: (i) =>
          spec.stamp === "updated_at" ? `${i.id}:${i.attributes?.updated_at ?? ""}` : String(i.id),
      });
    },
  };
}

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}

/**
 * Bounded collection (groups, organizations, an org's collections, one collection's projects): the
 * action is read with `returnAll` and `pollSnapshot` emits the ids not there last time. The seed
 * stores hashes and emits nothing; more than 5000 rows fails loudly in the kit.
 */
export function snykSnapshot(spec: SnapshotSpec): TriggerDefinition<Json> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const items = await (spec.action.execute as Execute)({ ...params, returnAll: true }, ctx);
      const rows = (Array.isArray(items) ? items : []) as Issue[];
      const { events, nextState } = await pollSnapshot({
        state,
        rows: rows.filter((r) => r?.id).map((r) => ({ key: String(r.id), values: r })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
