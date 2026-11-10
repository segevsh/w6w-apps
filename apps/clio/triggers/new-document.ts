import type { ActionDefinition } from "@w6w/types";
import { recordTriggers } from "../lib/records.ts";
import documentList from "../actions/document-list.ts";

export default recordTriggers({
  noun: "Document",
  action: documentList as unknown as ActionDefinition,
  fields: "id,etag,name,content_type,created_at,updated_at,matter{id,display_number}",
  output: [
    { key: "id", type: "number", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 4001,
    name: "Engagement letter.pdf",
    content_type: "application/pdf",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
}).newTrigger;
