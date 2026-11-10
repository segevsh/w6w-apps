import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import searchEvents from "../actions/search-events.ts";
import { idOf, records } from "../lib/triggers.ts";

// GET /events has no sort argument; Follow Up Boss returns every collection in reverse `id` order
// by default ("Resources are returned in reverse order by id by default"):
// https://docs.followupboss.com/reference/pagination (verified 2026-11-10).
export default pollFromListAction<Record<string, unknown>>({
  key: "new-lead-event",
  title: "New Lead Event",
  description:
    "The run gets each new lead event (inquiry, property view, registration, ...) in Follow Up Boss. Some events are visible only in the app and never appear here.",
  action: searchEvents as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "Event ID" },
    { key: "personId", type: "number", label: "Person ID" },
    { key: "type", type: "string", label: "Event type" },
    { key: "source", type: "string", label: "Source" },
    { key: "created", type: "string", label: "Created" },
  ],
  sample: {
    id: 9001,
    personId: 101,
    type: "Inquiry",
    source: "Zillow",
    created: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
