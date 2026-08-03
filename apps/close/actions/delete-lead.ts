import type { ActionDefinition } from "@w6w/types";
import { CloseClient } from "../lib/client.ts";

interface Input {
  leadId: string;
}

/**
 * `DELETE /lead/{id}/` — delete a Lead.
 *
 * This removes the Lead and everything hanging off it — contacts,
 * opportunities, tasks and activities all live on the Lead. Treat it as
 * destructive and irreversible via the API.
 *
 * Idempotent in the sense that matters for retries: deleting an already-deleted
 * Lead converges on the same end state. A retry after a timeout will surface
 * Close's 404 rather than doing further damage.
 */
const deleteLead: ActionDefinition<Input> = {
  key: "delete-lead",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description:
    "Delete a Lead. Destructive and irreversible — its contacts, opportunities, tasks and " +
    "activities go with it.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true, placeholder: "lead_..." },
  ],
  output: [],

  async execute(input, ctx) {
    ctx.log("warn", "deleting lead", { leadId: input.leadId });
    await new CloseClient(ctx).request(`/lead/${encodeURIComponent(input.leadId)}/`, {
      method: "DELETE",
    });
    return {};
  },
};

export default deleteLead;
