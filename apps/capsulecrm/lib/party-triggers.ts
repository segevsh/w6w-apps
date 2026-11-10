import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "./window.ts";
import partyList from "../actions/party-list.ts";
import { clock, MAX_PAGES, OVERLAP_MS, SEEN_WINDOW } from "./triggers.ts";

export interface Party {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

export const PARTY_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Party ID" },
  { key: "type", type: "string", label: "Type (person or organisation)" },
  { key: "name", type: "string", label: "Organisation name" },
  { key: "firstName", type: "string", label: "First name" },
  { key: "lastName", type: "string", label: "Last name" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

/**
 * `GET /parties?since=` returns records CHANGED since the stamp, in no documented order. A
 * window longer than `MAX_PAGES` pages is resumed from the persisted page on the next check and the
 * cursor moves only once it drains (brief 9.8); the seed stores `floor = now` and later checks drop
 * records stamped before it (brief 9.9).
 */
function check(mode: "new" | "updated", state: unknown, ctx: HookContext) {
  return pollWindow<Party, number>({
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
      const res = await partyList.execute({ since, page, perPage: 100 }, ctx) as {
        parties?: Party[];
        nextPage?: number;
      };
      const items = res.parties ?? [];
      // "changed since" also returns old records that were merely edited: a NEW party
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
  key: "new-party",
  title: "New Contact (Party)",
  description:
    "The run gets each newly created Capsule contact (party) (changed-since window, created inside it).",
  output: PARTY_OUTPUT,
  sample: {
    id: 1,
    type: "organisation",
    name: "Example Ltd",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T09:00:00Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check("new", state, ctx);
  },
};

export const updatedTrigger: TriggerDefinition = {
  key: "new-or-updated-party",
  title: "New or Updated Contact (Party)",
  description:
    "The run gets each Capsule contact (party) that is created or edited (changed-since window).",
  output: PARTY_OUTPUT,
  sample: {
    id: 1,
    type: "organisation",
    name: "Example Ltd",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T11:00:00Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check("updated", state, ctx);
  },
};
