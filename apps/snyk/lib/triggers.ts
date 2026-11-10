import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import action from "../actions/issue-list.ts";
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
  read(
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
      const res = await o.read(new Date(sinceMs).toISOString(), pos, o.ctx);
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
      idOf: (i) => `${i.id}:${i.attributes?.updated_at ?? ""}`,
    });
  },
};
