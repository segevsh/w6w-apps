import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description:
    "The run gets each newly created Circle event (Circle's default order for GET /events is newest by created_at).",
  action: eventList,
  // No `sort`: the documented default is "newest (by created_at)"; no token requests it.
  input: () => ({ page: 1, perPage: 100 }),
  items: (r) => (r as { records?: unknown[] }).records ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Event ID" },
    { key: "name", type: "string", label: "Event name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "starts_at", type: "string", label: "Starts at" },
  ],
  sample: {
    id: 42,
    name: "Monthly community call",
    created_at: "2026-11-09T09:00:00.000Z",
    starts_at: "2026-11-20T17:00:00.000Z",
  },
  maxPages: 1,
});
