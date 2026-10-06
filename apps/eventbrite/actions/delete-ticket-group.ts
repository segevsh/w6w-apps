import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  ticketGroupId: string;
}

const action: ActionDefinition<Input> = {
  key: "delete-ticket-group",
  type: "perform",
  resource: "ticket_group",
  title: "Delete Ticket Group",
  description: "Delete a ticket group on Eventbrite (its status becomes `deleted`).",
  idempotent: true,
  params: [
    { key: "ticketGroupId", label: "Ticket group ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/ticket_groups/${enc(input.ticketGroupId)}/`, {
      method: "DELETE",
    });
  },
};

export default action;
