import { sinceTrigger } from "../lib/since.ts";
import eventList from "../actions/event-list.ts";

/** `GET /events` with `filter[created_since]` = last check - overlap; paged 0-indexed. */
export default sinceTrigger({
  key: "new-event",
  title: "New Event",
  description:
    "The run gets each newly created event: its id, title, status and timestamps (JSON:API resource).",
  action: eventList,
  firstPage: 0,
  request: ({ sinceMs, page, pageSize }) => ({
    createdSince: String(Math.floor(sinceMs / 1000)),
    pageNumber: page,
    pageSize,
  }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Event attributes (title, status, created_at, …)" },
  ],
  sample: {
    id: "9c1f0a52-1111-4a2b-9d3e-0a1b2c3d4e5f",
    type: "events",
    attributes: { title: "Product launch webinar", created_at: 1794700800, updated_at: 1794700800 },
  },
});
