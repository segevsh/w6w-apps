import type { TriggerDefinition } from "@w6w/types";
import eventList from "../actions/event-list.ts";
import { readAllPages, snapshotAdded } from "../lib/triggers.ts";

/** Events carry no created stamp and `/events` documents no sort, so the whole list is diffed. */
const trigger: TriggerDefinition = {
  key: "new-event",
  title: "New Event",
  description: "The run gets each event newly created in the nation.",
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "start_at", type: "string", label: "Starts at" },
    { key: "venue_name", type: "string", label: "Venue" },
  ],
  sample: {
    id: "301",
    type: "events",
    name: "Volunteer night",
    start_at: "2026-12-01T18:00:00Z",
    venue_name: "Community hall",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows = await readAllPages(async (pageNumber) => {
      const out = await eventList.execute({ pageSize: 100, pageNumber }, ctx) as {
        items?: Record<string, unknown>[];
      };
      return out.items ?? [];
    }, "new-event");
    return snapshotAdded(state, rows);
  },
};

export default trigger;
