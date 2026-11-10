import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "./window.ts";
import opportunityList from "../actions/opportunity-list.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Per-check ceiling: 5 pages of 100. */
export const MAX_PAGES = 5;
export const MAX_EVENTS = 500;
/** At least MAX_EVENTS + one page, so an overlap re-list never evicts an id emitted last check. */
export const SEEN_WINDOW = 500 + 100;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface Opportunity {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

export const OPPORTUNITY_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Opportunity ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

/**
 * `GET /opportunities?since=` returns records CHANGED since the stamp, in no documented order. A
 * window longer than `MAX_PAGES` pages is resumed from the persisted page on the next check and the
 * cursor moves only once it drains (brief 9.8); the seed stores `floor = now` and later checks drop
 * records stamped before it (brief 9.9).
 */
function check(mode: "new" | "updated", state: unknown, ctx: HookContext) {
  return pollWindow<Opportunity, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: 100,
    seenWindow: SEEN_WINDOW,
    idOf: (r) => (mode === "new" ? String(r.id) : `${r.id}:${r.updatedAt}`),
    tsOf: (r) => toMs(mode === "new" ? r.createdAt : r.updatedAt),
    async load(sinceMs, pos) {
      const since = new Date(sinceMs).toISOString();
      const page = pos ?? 1;
      const res = await opportunityList.execute({ since, page, perPage: 100 }, ctx) as {
        opportunities?: Opportunity[];
        nextPage?: number;
      };
      const items = res.opportunities ?? [];
      // "changed since" also returns old records that were merely edited: a NEW opportunity
      // is one created inside the window.
      return {
        items: mode === "new" ? items.filter((o) => (o.createdAt ?? "") >= since) : items,
        next: res.nextPage,
        read: items.length,
      };
    },
  });
}

export const newTrigger: TriggerDefinition = {
  key: "new-opportunity",
  title: "New Opportunity",
  description:
    "The run gets each newly created Capsule opportunity (changed-since window, created inside it).",
  output: OPPORTUNITY_OUTPUT,
  sample: {
    id: 1,
    name: "Website redesign",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T09:00:00Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check("new", state, ctx);
  },
};

export const updatedTrigger: TriggerDefinition = {
  key: "new-or-updated-opportunity",
  title: "New or Updated Opportunity",
  description:
    "The run gets each Capsule opportunity that is created or edited (changed-since window).",
  output: OPPORTUNITY_OUTPUT,
  sample: {
    id: 1,
    name: "Website redesign",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T11:00:00Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check("updated", state, ctx);
  },
};
