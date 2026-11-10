import type { ActionDefinition } from "@w6w/types";
import { recordTriggers } from "../lib/records.ts";
import activityList from "../actions/activity-list.ts";

export default recordTriggers({
  noun: "Activity",
  action: activityList as unknown as ActionDefinition,
  fields:
    "id,etag,type,date,quantity,price,total,note,non_billable,matter{id,display_number},user{id,name},created_at,updated_at",
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "date", type: "string", label: "Date" },
    { key: "total", type: "number", label: "Total" },
    { key: "note", type: "string", label: "Note" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 5001,
    type: "TimeEntry",
    date: "2026-11-09",
    total: 150,
    note: "Drafted letter",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
}).updatedTrigger;
