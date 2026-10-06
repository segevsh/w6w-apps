import type { ActionDefinition } from "@w6w/types";
import { call, ticketPath } from "../lib/client.ts";
import { int } from "../lib/params.ts";

/** `DELETE /tickets/{ticketId}` -> 204. */
type Input = { ticket_id: number };

const ticketDelete: ActionDefinition<Input> = {
  key: "ticket-delete",
  type: "perform",
  resource: "ticket",
  title: "Delete Ticket",
  description: "Permanently delete a ticket.",
  idempotent: true,
  params: [int("ticket_id", "Ticket ID", { required: true, validation: { min: 1 } })],
  output: [
    { key: "deleted", type: "boolean", label: "True when the ticket was deleted" },
    { key: "id", type: "number", label: "Ticket ID" },
  ],
  async execute(input, ctx) {
    const id = ticketPath(input.ticket_id);
    await call(ctx, "DELETE", `/tickets/${id}`);
    return { deleted: true, id: Number(id) };
  },
};

export default ticketDelete;
