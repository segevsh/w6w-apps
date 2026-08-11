import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `GET /leads/{id}` — one lead.
 *
 * `conversions` is populated only after the lead has been converted, and lists
 * `{type, id}` for each job or estimate it became. `lost_at` is set when the
 * lead is marked lost and null otherwise.
 */
interface Input {
  leadId: string;
  companyId?: string;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description:
    "Fetch one lead by id. `conversions` lists the jobs or estimates it became, and is empty " +
    "until it is converted.",
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "number", type: "number", label: "Lead number" },
    { key: "status", type: "string", label: "Status (open, won, lost)" },
    { key: "total_amount", type: "number", label: "Total amount (cents)" },
    { key: "conversions", type: "array", label: "Conversions" },
    { key: "customer", type: "object", label: "Customer" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/leads/${encodeId(input.leadId)}`, {
      companyId: input.companyId,
    });
  },
};

export default leadGet;
