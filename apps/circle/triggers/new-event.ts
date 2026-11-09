import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";
export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly created event.",
  action: eventList,
  input: () => ({ page: 1, perPage: 100 }),
  items: (r) => Array.isArray(r) ? r : ((r as { data?: unknown[] }).data ?? []),
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Event ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
