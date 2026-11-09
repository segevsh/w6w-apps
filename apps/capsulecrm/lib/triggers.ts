import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
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

/** The kit's ids envelope plus the epoch ms of the last successful check. */
interface CursorState {
  cursor?: number;
}

export const OPPORTUNITY_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Opportunity ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

/** `GET /opportunities?since=` returns records CHANGED since the stamp, in no documented order. */
async function fetchSince(since: string, mode: "new" | "updated", ctx: HookContext) {
  const out: Opportunity[] = [];
  let page: number | undefined = 1;
  while (page !== undefined && page <= MAX_PAGES) {
    const res = await opportunityList.execute({ since, page, perPage: 100 }, ctx) as {
      opportunities?: Opportunity[];
      nextPage?: number;
    };
    out.push(...(res.opportunities ?? []));
    page = res.nextPage;
  }
  // "changed since" also returns old records that were merely edited: a NEW opportunity
  // is one created inside the window.
  return mode === "new" ? out.filter((o) => (o.createdAt ?? "") >= since) : out;
}

async function check(
  mode: "new" | "updated",
  state: unknown,
  ctx: HookContext,
) {
  const checkedAt = clock.now();
  const prior = state as CursorState | undefined;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const since = new Date(cursor - OVERLAP_MS).toISOString();
  const stampOf = (r: Opportunity) => (mode === "new" ? r.createdAt : r.updatedAt) ?? "";
  const { events, nextState } = await pollNewItems<Opportunity>({
    state,
    maxPages: 1,
    maxEvents: MAX_EVENTS,
    seenWindow: SEEN_WINDOW,
    idOf: (r) => (mode === "new" ? String(r.id) : `${r.id}:${r.updatedAt}`),
    async fetchPage() {
      const all = await fetchSince(since, mode, ctx);
      // The kit wants newest-first pages.
      all.sort((a, b) => (stampOf(a) < stampOf(b) ? 1 : stampOf(a) > stampOf(b) ? -1 : 0));
      return { items: all };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
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
