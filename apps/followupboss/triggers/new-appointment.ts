import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import searchAppointments from "../actions/search-appointments.ts";
import { idOf, records } from "../lib/triggers.ts";

// GET /appointments has no sort argument; Follow Up Boss returns every collection in reverse `id`
// order by default ("Resources are returned in reverse order by id by default"):
// https://docs.followupboss.com/reference/pagination (verified 2026-11-10).
export default pollFromListAction<Record<string, unknown>>({
  key: "new-appointment",
  title: "New Appointment",
  description:
    "The run gets each newly created appointment the connected user made in Follow Up Boss (the API only returns appointments created by the authenticating user, inside Follow Up Boss, with the calendar shared).",
  action: searchAppointments as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "Appointment ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "start", type: "string", label: "Start" },
    { key: "end", type: "string", label: "End" },
    { key: "createdById", type: "number", label: "Created by user ID" },
  ],
  sample: {
    id: 77,
    title: "Showing at 12 Main St",
    start: "2026-11-12T15:00:00Z",
    end: "2026-11-12T16:00:00Z",
    createdById: 4,
  },
  maxPages: 1,
});
