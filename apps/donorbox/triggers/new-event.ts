import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly listed Donorbox event.",
  action: eventList,
  input: () => ({ page: 1, per_page: 100, order: "desc" }),
  items: (result) =>
    Array.isArray((result as { data?: unknown[] }).data)
      ? (result as { data: unknown[] }).data
      : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Event ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
