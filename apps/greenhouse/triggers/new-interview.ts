import type { TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import listInterviews from "../actions/list-interviews.ts";

/** Look-back before the previous check, so an interview created late is still seen. */
export const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const SEEN_WINDOW = 2 * MAX_PAGES * PAGE_SIZE;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

type Item = { id?: unknown; created_at?: unknown };

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
  poll({ state }, ctx) {
    return pollWindow<Item, string>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (i) => String(i.id ?? ""),
      tsOf: (i) => {
        const ms = Date.parse(String(i.created_at ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, cursor) {
        // A cursor request must carry no other filters; the cursor already pins them.
        const res = await listInterviews.execute(
          cursor ? { cursor } : {
            perPage: PAGE_SIZE,
            createdAtOperator: "gte",
            createdAt: new Date(since).toISOString(),
          },
          ctx,
        ) as Page;
        return { items: (res.items ?? []) as Item[], next: res.nextCursor || undefined };
      },
    });
  },
};

export default trigger;
