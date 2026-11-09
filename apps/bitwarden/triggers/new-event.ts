import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly recorded organization audit event.",
  action: eventList,
  input: () => ({ maxPages: 1 }),
  items: (result) => (result as { events?: unknown[] }).events ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Event ID" }],
  sample: { id: "9a327ab7-5be3-4f8a-a0df-b0a300a5f92a" },
  maxPages: 1,
});
