import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-event-instances.ts";

// Planning Center documents `order` on /calendar/v2/event_instances with `created_at` orderable
// and "prefix with a hyphen (-created_at) to reverse the order", so `-created_at` is newest-first
// (https://api.planningcenteronline.com/calendar/v2/documentation/2022-07-07/vertices/event_instance).
export default pollFromListAction({
  key: "new-event-instance",
  title: "New Event Instance",
  description: "The run gets each newly created event occurrence.",
  action,
  input: () => ({ order: "-created_at", perPage: 100, offset: 0 }),
  items: (r) => (r as { eventInstances?: unknown[] }).eventInstances ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Event instance ID" },
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "startsAt", type: "string", label: "Starts at" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "instance-2",
    eventId: "event-1",
    startsAt: "2026-11-15T10:00:00Z",
    createdAt: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
