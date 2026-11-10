import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/event-list.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newEvent = pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly created event.",
  action,
  input: (_params) => ({}),
  items: (result) => {
    const r = result as { data?: unknown[] };
    return r.data ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Event ID" }],
  sample: { sequenceId: 1 },
  maxPages: 1,
});

export default newEvent;
