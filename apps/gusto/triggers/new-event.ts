import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each new account event.",
  action: eventList,
  input: () => ({ limit: 100, returnAll: false, sortOrder: "desc" }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [{ key: "uuid", type: "string", label: "Event UUID" }],
  sample: { uuid: "event-1", event_type: "employee.created" },
  maxPages: 1,
});
