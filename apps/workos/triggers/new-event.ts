import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each new WorkOS event.",
  action: eventList,
  params: [{ key: "events", label: "Event Types", type: "string", required: true }],
  input: (p: { events?: string }) => ({ events: p.events, maxPages: 1 }),
  items: (r) => (r as { events?: unknown[] }).events ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Event ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
