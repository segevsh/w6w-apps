import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/tickets/{id}` — Delete a support ticket. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const ticketDelete: ActionDefinition<Input> = {
  key: "ticket-delete",
  type: "perform",
  resource: "ticket",
  title: "Delete Ticket",
  description: "Delete a support ticket.",
  idempotent: true,
  params: [idParam("id", "Ticket ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/tickets/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default ticketDelete;
