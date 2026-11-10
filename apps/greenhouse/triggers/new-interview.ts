import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listInterviews from "../actions/list-interviews.ts";

/** Look-back before the previous check, so an interview created late is still seen. */
export const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const MAX_EVENTS = MAX_PAGES * PAGE_SIZE;
const SEEN_WINDOW = 2 * MAX_EVENTS;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Page {
  items?: unknown[];
  nextCursor?: string;
}

const trigger: TriggerDefinition = {
  key: "new-interview",
  title: "New Interview",
  description: "The run gets each newly scheduled interview.",
  output: [
    { key: "id", type: "number", label: "Interview ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 1, created_at: "2026-11-09T09:30:00Z" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const checkedAt = clock.now();
    const prior = (state ?? {}) as { cursor?: unknown };
    const since = typeof prior.cursor === "number" ? prior.cursor : checkedAt;
    const createdAt = new Date(since - OVERLAP_MS).toISOString();
    let complete = true;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      seenWindow: SEEN_WINDOW,
      maxEvents: MAX_EVENTS,
      idOf: (i) => String((i as { id?: unknown }).id ?? ""),
      // Harvest v3 pages carry no documented order, so every page of the window is read.
      async fetchPage() {
        const all: unknown[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          // A cursor request must carry no other filters; the cursor already pins them.
          const res = await listInterviews.execute(
            cursor ? { cursor } : { perPage: PAGE_SIZE, createdAtOperator: "gte", createdAt },
            ctx,
          ) as Page;
          all.push(...(res.items ?? []));
          if (!res.nextCursor) return { items: all.reverse() };
          cursor = res.nextCursor;
        }
        complete = false;
        return { items: all.reverse() };
      },
    });
    return { events, nextState: { ...nextState, cursor: complete ? checkedAt : since } };
  },
};

export default trigger;
