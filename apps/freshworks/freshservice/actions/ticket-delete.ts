import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";

interface Input {
  ticketId: number;
}

const ticketDelete: ActionDefinition<Input> = {
  key: "ticket-delete",
  type: "perform",
  resource: "ticket",
  title: "Delete Ticket",
  description:
    "Move a ticket to the trash. Deleting a parent service request deletes its child tickets too; `ticket-restore` brings it back.",
  // Deleting an already-deleted ticket id is a no-op from the caller's
  // perspective (Freshservice answers 404, which a retry can treat as done).
  idempotent: true,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new FreshserviceClient(ctx).request(`/tickets/${input.ticketId}`, { method: "DELETE" });
    return { success: true };
  },
};

export default ticketDelete;
