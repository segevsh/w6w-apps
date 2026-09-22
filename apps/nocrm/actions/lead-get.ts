import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, V2 } from "../lib/client.ts";
import { leadOutput } from "../lib/params.ts";

interface Input {
  leadId: string;
}

/**
 * `GET /api/v2/leads/{id}` — retrieve one lead.
 *
 * The Retrieve-a-lead section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents a single `id`
 * parameter, "Lead's id. The identifier of the lead", and lists `record_not_found`
 * among the 404 types.
 */
const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Retrieve one lead by its id (GET /api/v2/leads/{id}).",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "The lead's id, as returned by Create Lead or List Leads.",
    },
  ],
  output: leadOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(`${V2}/leads/${encodeURIComponent(input.leadId)}`);
  },
};

export default leadGet;
