import type { ActionDefinition } from "@w6w/types";
import { ZendeskClient } from "../lib/client.ts";
import { ticketOutput } from "../lib/params.ts";

const ticketGet: ActionDefinition<{ ticketId: number }> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch a ticket by id.",
  params: [{ key: "ticketId", label: "Ticket ID", type: "number", required: true }],
  output: ticketOutput,

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/tickets/${input.ticketId}.json`);
  },
};

export default ticketGet;
