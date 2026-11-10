import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-or-updated-event",
  title: "New or Updated Event",
  description: "The run gets each new or updated event.",
  action: eventList as ActionDefinition,
  input: (_params) => ({ createdSince: "1970-01-01T00:00:00Z", pageNumber: 1, pageSize: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String((item as { id?: unknown; updated_at?: unknown }).id ?? "") + ":" +
    String((item as { updated_at?: unknown }).updated_at ?? ""),

  output: [{ key: "id", type: "string", label: "New Event ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
