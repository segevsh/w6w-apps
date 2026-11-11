import type { ActionDefinition, HookContext, TriggerDefinition } from "@w6w/types";
import action from "../actions/user-reputation-list.ts";

type Params = { site?: string; userIds: string };

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 100;
/** Pages read per check; a larger window is drained across successive checks (resume). */
export const MAX_PAGES = 5;
export const SEEN_WINDOW = 5000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface State {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  /** Epoch ms: records created before the seed are never emitted. */
  floor: number;
  /** Epoch ms of the last fully drained check. */
  cursor: number;
  /** Set while a window is only partly drained: continue at `page` with the same `since`. */
  resume?: { page: number; since: number };
}

interface Row {
  on_date?: unknown;
  post_id?: unknown;
  vote_type?: unknown;
  user_id?: unknown;
}

const idOf = (row: Row) =>
  `${row.user_id ?? ""}:${row.post_id ?? ""}:${row.vote_type ?? ""}:${row.on_date ?? ""}`;

/**
 * Shape (b): `/users/{ids}/reputation` honours `fromdate` and answers newest first (`on_date`
 * descending), but has no sort parameter, so each check asks for `cursor - overlap`, reads up to
 * MAX_PAGES pages, and dedupes on the composite id (a row has no id of its own).
 */
const trigger: TriggerDefinition<Params> = {
  key: "new-user-reputation-change",
  title: "New Reputation Change",
  description: "The run gets each new reputation change of the selected users.",
  minIntervalMs: 300_000,
  params: (action.params ?? []).filter((param) => param.key === "site" || param.key === "userIds"),
  output: [
    { key: "user_id", type: "number", label: "User ID" },
    { key: "post_id", type: "number", label: "Post ID" },
    { key: "vote_type", type: "string", label: "Vote type" },
    { key: "reputation_change", type: "number", label: "Reputation change" },
    { key: "on_date", type: "number", label: "When (unix seconds)" },
  ],
  sample: {
    user_id: 101,
    post_id: 5001,
    vote_type: "up_votes",
    reputation_change: 10,
    on_date: 1762646400,
  },
  async poll({ params, state }, ctx: HookContext) {
    const checkedAt = clock.now();
    const prior = state as Partial<State> | null;
    if (
      !prior || prior.v !== 1 || prior.kind !== "ids" || prior.seeded !== true ||
      typeof prior.floor !== "number" || typeof prior.cursor !== "number" ||
      !Array.isArray(prior.ids)
    ) {
      const seed: State = {
        v: 1,
        kind: "ids",
        seeded: true,
        ids: [],
        floor: checkedAt,
        cursor: checkedAt,
      };
      return { events: [], nextState: seed };
    }
    const since = prior.resume?.since ?? Math.floor((prior.cursor - OVERLAP_MS) / 1000);
    const start = prior.resume?.page ?? 1;
    const seen = new Set(prior.ids);
    const found: Row[] = [];
    let more = false;
    let next = start;
    for (let n = 0; n < MAX_PAGES; n++) {
      const result = await (action as unknown as ActionDefinition).execute!(
        {
          site: params.site,
          userIds: params.userIds,
          page: start + n,
          pageSize: PAGE_SIZE,
          fromDate: since,
        },
        ctx,
      ) as { items?: Row[]; hasMore?: boolean };
      found.push(...(result.items ?? []));
      next = start + n + 1;
      more = result.hasMore === true;
      if (!more) break;
    }
    const fresh: Row[] = [];
    const taken = new Set<string>();
    for (const row of found) {
      const id = idOf(row);
      if (seen.has(id) || taken.has(id)) continue;
      // A row with no parseable timestamp is kept (§9.9).
      if (typeof row.on_date === "number" && row.on_date * 1000 < prior.floor) continue;
      taken.add(id);
      fresh.push(row);
    }
    fresh.sort((a, b) => Number(a.on_date ?? 0) - Number(b.on_date ?? 0));
    const ids = [...prior.ids, ...fresh.map(idOf)].slice(-SEEN_WINDOW);
    const nextState: State = {
      v: 1,
      kind: "ids",
      seeded: true,
      ids,
      floor: prior.floor,
      cursor: more ? prior.cursor : checkedAt,
      ...(more ? { resume: { page: next, since } } : {}),
    };
    return { events: fresh, nextState };
  },
};

export default trigger;
