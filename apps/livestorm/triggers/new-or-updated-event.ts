import { sinceTrigger } from "../lib/since.ts";
import eventList from "../actions/event-list.ts";

/** `GET /events` with `filter[updated_since]` = last check - overlap; id + `updated_at` dedupe. */
export default sinceTrigger({
  key: "new-or-updated-event",
  title: "New or Updated Event",
  description: "The run gets each event that was created or edited: its id, title and timestamps.",
  action: eventList,
  firstPage: 0,
  request: ({ sinceMs, page, pageSize }) => ({
    updatedSince: String(Math.floor(sinceMs / 1000)),
    pageNumber: page,
    pageSize,
  }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const e = item as { id?: unknown; attributes?: { updated_at?: unknown } };
    return `${String(e.id ?? "")}:${String(e.attributes?.updated_at ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Event attributes (title, status, updated_at, …)" },
  ],
  sample: {
    id: "9c1f0a52-1111-4a2b-9d3e-0a1b2c3d4e5f",
    type: "events",
    attributes: { title: "Product launch webinar", created_at: 1794700800, updated_at: 1794704400 },
  },
});
