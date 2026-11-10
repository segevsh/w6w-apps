import { pollWindow } from "../lib/window.ts";
import type { TriggerDefinition } from "@w6w/types";
import eventList from "../actions/event-list.ts";

/** Look-back before the previous check, so an event recorded late is still seen. */
export const OVERLAP_MS = 120_000;
const PER_PAGE = 100;
/** Pages one check reads; a bigger window resumes next check. */
const MAX_PAGES = 5;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface AtlasEvent {
  id?: unknown;
  eventTypeName?: unknown;
  created?: unknown;
}

const idOf = (e: AtlasEvent) =>
  e.id !== undefined ? String(e.id) : `${String(e.eventTypeName ?? "")}:${String(e.created ?? "")}`;

/**
 * Shape (b) since-filter: calls the SAME `event-list` action with `minDate = cursor - overlap`
 * (listGroupEvents documents `minDate` as the time from which events are returned; the endpoint
 * states no sort order, so none is assumed) and dedupes by event id. The first check reads
 * nothing and floors at `now` (brief 9.9).
 */
const trigger: TriggerDefinition<{ projectId: string }> = {
  key: "new-event",
  title: "New Event",
  description: "The run gets each MongoDB Atlas project event recorded since the last check.",
  params: [{ key: "projectId", label: "Project ID", type: "string", required: true }],
  output: [{ key: "eventTypeName", type: "string", label: "Event type" }],
  sample: { id: "evt1", eventTypeName: "CLUSTER_CREATED", created: "2026-11-09T12:00:00Z" },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return pollWindow<AtlasEvent, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PER_PAGE,
      seenWindow: 1000,
      idOf,
      tsOf: (e) => {
        const ms = Date.parse(String(e.created ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, pageNum, until) {
        // Continuation pages are bounded by the window start (`maxDate`) so events recorded while
        // the window drains cannot shift the page numbers; the next window reads them.
        const result = await eventList.execute(
          {
            projectId: params.projectId,
            minDate: new Date(since).toISOString(),
            ...(pageNum === undefined ? {} : { maxDate: new Date(until).toISOString() }),
            itemsPerPage: PER_PAGE,
            pageNum: pageNum ?? 1,
          },
          ctx,
        ) as { events?: AtlasEvent[] };
        const items = result.events ?? [];
        // The vendor documents no order; hand the kit newest-created-first.
        items.sort((a, b) => String(b.created ?? "").localeCompare(String(a.created ?? "")));
        return { items, next: items.length >= PER_PAGE ? (pageNum ?? 1) + 1 : undefined };
      },
    });
  },
};

export default trigger;
