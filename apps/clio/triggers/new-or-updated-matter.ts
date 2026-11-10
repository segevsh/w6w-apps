import type { ActionDefinition } from "@w6w/types";
import { recordTriggers } from "../lib/records.ts";
import matterList from "../actions/matter-list.ts";

export default recordTriggers({
  noun: "Matter",
  action: matterList as unknown as ActionDefinition,
  fields:
    "id,etag,display_number,description,status,client{id,name},open_date,close_date,created_at,updated_at",
  output: [
    { key: "id", type: "number", label: "Matter ID" },
    { key: "display_number", type: "string", label: "Matter number" },
    { key: "description", type: "string", label: "Description" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 1001,
    display_number: "00001-Example",
    description: "Example matter",
    status: "Open",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
}).updatedTrigger;
