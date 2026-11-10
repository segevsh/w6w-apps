import type { ActionDefinition } from "@w6w/types";
import { idOfRevision, odataFeed } from "../lib/triggers.ts";
import timeEntryList from "../actions/time-entry-list.ts";

/** OData `$orderby` newest-first; `createdAt`/`updatedAt` are on the entity ($metadata, verified 2026-11-10). */
export default odataFeed({
  key: "new-or-updated-time-entry",
  title: "New or Updated Time Entry",
  description:
    "The run gets each time entry that was created or corrected, with its new time and status.",
  action: timeEntryList as ActionDefinition,
  orderBy: "updatedAt desc",
  idOf: idOfRevision,
  output: [
    { key: "id", type: "string", label: "Time entry ID" },
    { key: "personId", type: "string", label: "Person ID" },
    { key: "type", type: "string", label: "In or Out" },
    { key: "time", type: "string", label: "Entry time" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "entry-1",
    personId: "person-1",
    type: "In",
    time: "2026-11-10T08:00:00Z",
    belongsToDate: "2026-11-10",
    status: "Edited",
    createdAt: "2026-11-10T08:00:01Z",
    updatedAt: "2026-11-10T09:30:00Z",
  },
});
