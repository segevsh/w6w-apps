import type { ActionDefinition } from "@w6w/types";
import { call, ticketPath } from "../lib/client.ts";
import { int } from "../lib/params.ts";

/** `GET /tickets/{ticketId}`. */
type Input = { ticket_id: number };

const ticketGet: ActionDefinition<Input> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch one ticket with its messages.",
  params: [int("ticket_id", "Ticket ID", { required: true, validation: { min: 1 } })],
  output: [
    { key: "id", type: "number", label: "Ticket ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "open, pending or solved" },
    { key: "priority", type: "string", label: "low, normal or urgent" },
    { key: "messages", type: "array", label: "Ticket messages" },
  ],
  async execute(input, ctx) {
    return await call(ctx, "GET", `/tickets/${ticketPath(input.ticket_id)}`);
  },
};

export default ticketGet;
