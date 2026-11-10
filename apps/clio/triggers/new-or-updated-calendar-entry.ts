import type { ActionDefinition } from "@w6w/types";
import { recordTriggers } from "../lib/records.ts";
import calendarEntryList from "../actions/calendar-entry-list.ts";

export default recordTriggers({
  noun: "Calendar Entry",
  action: calendarEntryList as unknown as ActionDefinition,
  fields:
    "id,etag,summary,description,start_at,end_at,all_day,location,matter{id,display_number},created_at,updated_at",
  output: [
    { key: "id", type: "number", label: "Calendar entry ID" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "start_at", type: "string", label: "Starts at" },
    { key: "end_at", type: "string", label: "Ends at" },
    { key: "location", type: "string", label: "Location" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 6001,
    summary: "Hearing",
    start_at: "2026-11-20T15:00:00Z",
    end_at: "2026-11-20T16:00:00Z",
    location: "Courtroom 4",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
}).updatedTrigger;
