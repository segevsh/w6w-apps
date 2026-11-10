import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import eventList from "../actions/event-list.ts";

/** Look-back before the previous check, so an event recorded late is still seen. */
export const OVERLAP_MS = 120_000;
const PER_PAGE = 100;
const MAX_PAGES = 3;

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
 * states no sort order, so none is assumed) and dedupes by event id. The first check only
 * records the cursor.
 */
const trigger: TriggerDefinition<{ projectId: string }> = {
  key: "new-event",
  title: "New Event",
  description: "The run gets each MongoDB Atlas project event recorded since the last check.",
  params: [{ key: "projectId", label: "Project ID", type: "string", required: true }],
  output: [{ key: "eventTypeName", type: "string", label: "Event type" }],
  sample: { id: "evt1", eventTypeName: "CLUSTER_CREATED", created: "2026-11-09T12:00:00Z" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const s = state as { v?: number; kind?: string; seeded?: boolean; cursor?: unknown };
    const checkedAt = clock.now();
    if (!(s?.v === 1 && s.kind === "ids" && s.seeded === true && typeof s.cursor === "number")) {
      return {
        events: [],
        nextState: { v: 1, kind: "ids", seeded: true, ids: [], cursor: checkedAt },
      };
    }
    const minDate = new Date(s.cursor - OVERLAP_MS).toISOString();
    const { events, nextState } = await pollNewItems<AtlasEvent>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 400,
      idOf,
      async fetchPage() {
        const items: AtlasEvent[] = [];
        for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
          const result = await eventList.execute(
            { projectId: params.projectId, minDate, itemsPerPage: PER_PAGE, pageNum },
            ctx,
          ) as { events?: AtlasEvent[] };
          const got = result.events ?? [];
          items.push(...got);
          if (got.length < PER_PAGE) break;
        }
        // The vendor documents no order; hand the kit newest-created-first.
        items.sort((a, b) => String(b.created ?? "").localeCompare(String(a.created ?? "")));
        return { items };
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } };
  },
};

export default trigger;
