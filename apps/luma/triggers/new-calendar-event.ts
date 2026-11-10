import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import calendarEventsList from "../actions/calendar-events-list.ts";

export default pollFromListAction({
  key: "new-calendar-event",
  title: "New Calendar Event",
  description: "The run gets each newly created calendar event.",
  action: calendarEventsList as ActionDefinition,
  input: (_params) => ({ sortDirection: "desc", paginationLimit: 100 }),
  items: (r) => (r as { entries?: unknown[] }).entries ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),

  output: [{ key: "id", type: "string", label: "New Calendar Event ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
