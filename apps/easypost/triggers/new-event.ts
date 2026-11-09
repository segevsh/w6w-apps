import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly returned EasyPost event.",
  action: eventList,
  input: () => ({ startDatetime: "1970-01-01T00:00:00Z", limit: 100 }),
  items: (result) =>
    Array.isArray((result as { events?: unknown[] }).events)
      ? (result as { events: unknown[] }).events
      : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Event ID" }],
  sample: { id: "evt_1" },
  maxPages: 1,
});
