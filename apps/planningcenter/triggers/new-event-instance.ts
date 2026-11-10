import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-event-instances.ts";

export default pollFromListAction({
  key: "new-event-instance",
  title: "New Event Instance",
  description: "The run gets each newly created event instance.",
  action,
  input: () => ({ startsAfter: "2026-01-01T00:00:00Z", perPage: 100, offset: 0 }),
  items: (r) => (r as { eventInstances?: unknown[] }).eventInstances ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Event instance ID" }],
  sample: { id: "instance-2" },
  maxPages: 1,
});
