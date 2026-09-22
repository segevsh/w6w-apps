import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, V2 } from "../lib/client.ts";

interface Input {
  leadId: string;
}

/**
 * `DELETE /api/v2/leads/{id}` — delete a lead.
 *
 * The Delete-a-lead section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) takes just the lead's id and
 * lists `record_not_found` under 404. It adds one warning this app repeats in
 * the hint: under USER-token auth, a user who cannot see a lead "could not be
 * deleted and will result in a 404 answer as the lead cannot be found".
 *
 * Idempotent: deleting an id twice leaves the same state (the second call
 * answers 404, which is the client's `record_not_found`).
 */
const leadDelete: ActionDefinition<Input> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description: "Delete a lead by its id (DELETE /api/v2/leads/{id}).",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "The lead's id. With a USER token, a lead the user cannot see answers 404.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Deleted lead ID" }],

  execute(input, ctx) {
    return new NocrmClient(ctx).request(`${V2}/leads/${encodeURIComponent(input.leadId)}`, {
      method: "DELETE",
    });
  },
};

export default leadDelete;
