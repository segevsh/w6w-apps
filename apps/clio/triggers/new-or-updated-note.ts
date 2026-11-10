import type { ActionDefinition } from "@w6w/types";
import { recordTriggers } from "../lib/records.ts";
import noteList from "../actions/note-list.ts";

export default recordTriggers({
  noun: "Note",
  action: noteList as unknown as ActionDefinition,
  fields:
    "id,etag,subject,date,detail,type,matter{id,display_number},contact{id,name},created_at,updated_at",
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "type", type: "string", label: "Type" },
    { key: "date", type: "string", label: "Date" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 3001,
    subject: "Call with client",
    type: "Matter",
    date: "2026-11-09",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
}).updatedTrigger;
