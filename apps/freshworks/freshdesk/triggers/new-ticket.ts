import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import ticketGetMany from "../actions/ticket-get-many.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-ticket",
  title: "New Ticket",
  description: "The run gets each newly created Freshdesk ticket, oldest first.",
  action: ticketGetMany as unknown as ActionDefinition,
  input: () => ({ orderBy: "created_at", orderType: "desc", page: 1, perPage: 100 }),
  items: (result) => (result as { tickets?: unknown[] }).tickets ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.id ?? "");
  },
  output: [
    { key: "id", type: "number", label: "Ticket ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "number", label: "Status" },
    { key: "priority", type: "number", label: "Priority" },
    { key: "requester_id", type: "number", label: "Requester ID" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: 1201,
    subject: "Cannot log in",
    status: 2,
    priority: 1,
    requester_id: 77,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
