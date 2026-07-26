import type { ActionDefinition } from "@w6w/types";
import { ZendeskClient } from "../lib/client.ts";

/**
 * Soft-deletes the ticket — it lands in the deleted-tickets view and is purged
 * later. Requires an admin account.
 */
const ticketDelete: ActionDefinition<{ ticketId: number }> = {
  key: "ticket-delete",
  type: "perform",
  resource: "ticket",
  title: "Delete Ticket",
  description:
    "Soft-delete a ticket. It moves to the deleted view before being purged. Admin only.",
  idempotent: true,
  params: [{ key: "ticketId", label: "Ticket ID", type: "number", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/tickets/${input.ticketId}.json`, {
      method: "DELETE",
    });
  },
};

export default ticketDelete;
