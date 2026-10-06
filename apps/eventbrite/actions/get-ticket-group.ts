import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  ticketGroupId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-ticket-group",
  type: "read",
  resource: "ticket_group",
  title: "Get Ticket Group",
  description: "Retrieve a ticket group by ID.",
  idempotent: true,
  params: [
    { key: "ticketGroupId", label: "Ticket group ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "event_ticket_ids", type: "object", label: "Event ticket IDs" },
    { key: "tickets", type: "array", label: "Tickets" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/ticket_groups/${enc(input.ticketGroupId)}/`, {
      method: "GET",
    });
  },
};

export default action;
