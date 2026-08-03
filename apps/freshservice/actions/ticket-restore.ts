import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";

interface Input {
  ticketId: number;
}

const ticketRestore: ActionDefinition<Input> = {
  key: "ticket-restore",
  type: "perform",
  resource: "ticket",
  title: "Restore Ticket",
  description: "Bring a trashed ticket back. The counterpart to `ticket-delete`.",
  // Restoring an already-restored ticket lands on the same state.
  idempotent: true,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Restored" }],

  async execute(input, ctx) {
    // Documented as PUT with an empty body; the API answers 204 No Content.
    await new FreshserviceClient(ctx).request(`/tickets/${input.ticketId}/restore`, {
      method: "PUT",
    });
    return { success: true };
  },
};

export default ticketRestore;
