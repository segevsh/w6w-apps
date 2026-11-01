import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { TICKET_GROUP_OUTPUT, TICKET_GROUP_SAMPLE } from "../lib/outputs.ts";

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
  output: TICKET_GROUP_OUTPUT,
  sample: TICKET_GROUP_SAMPLE,

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/ticket_groups/${enc(input.ticketGroupId)}/`, {
      method: "GET",
    });
  },
};

export default action;
