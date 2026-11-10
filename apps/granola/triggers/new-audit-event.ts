import { pollFromListAction } from "../../_shared/poll/mod.ts";
import auditEventList from "../actions/audit-event-list.ts";

export default pollFromListAction({
  key: "new-audit-event",
  title: "New Audit Event",
  description: "The run gets each newly recorded audit event.",
  action: auditEventList,
  input: () => ({ pageSize: 100 }),
  items: (result) => (result as { events?: unknown[] }).events ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; eventId?: unknown }).id ?? (item as { eventId?: unknown }).eventId ??
        "",
    ),
  output: [{ key: "id", type: "string", label: "Audit event ID" }],
  sample: { id: "event-1" },
  maxPages: 1,
});
