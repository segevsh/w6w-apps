import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-event-instances.ts";

// `updated_at` is orderable on /calendar/v2/event_instances ("prefix with a hyphen (-updated_at)
// to reverse the order"); the id carries `updatedAt` so an edit is a new event (brief 9.2).
export default pollFromListAction({
  key: "new-or-updated-event-instance",
  title: "New or Updated Event Instance",
  description: "The run gets each event occurrence that was created or updated.",
  action,
  input: () => ({ order: "-updated_at", perPage: 100, offset: 0 }),
  items: (r) => (r as { eventInstances?: unknown[] }).eventInstances ?? [],
  idOf: (x) => {
    const i = x as { id?: unknown; updatedAt?: unknown };
    return `${i.id ?? ""}:${i.updatedAt ?? ""}`;
  },
  output: [
    { key: "id", type: "string", label: "Event instance ID" },
    { key: "eventId", type: "string", label: "Event ID" },
    { key: "startsAt", type: "string", label: "Starts at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "instance-2",
    eventId: "event-1",
    startsAt: "2026-11-15T10:00:00Z",
    updatedAt: "2026-11-10T09:30:00Z",
  },
  maxPages: 1,
});
