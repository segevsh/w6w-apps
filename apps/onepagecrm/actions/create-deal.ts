import type { ActionDefinition } from "@w6w/types";
import { OnePageClient } from "../lib/client.ts";
import { DEAL_FIELD_PARAMS, dealBody } from "../lib/params.ts";

/**
 * `POST /deals` — create a deal on a contact; `contact_id` and `name` are required by the vendor.
 * `status` defaults to pending. Not idempotent: a retry makes a second deal.
 */
const createDeal: ActionDefinition<Record<string, unknown>> = {
  key: "create-deal",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Create a deal on a contact (pending by default).",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    ...DEAL_FIELD_PARAMS.map((p) => p.key === "name" ? { ...p, required: true } : p),
  ],
  output: [{ key: "deal", type: "object", label: "The created deal" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data("/deals", { method: "POST", body: dealBody(input) });
  },
};

export default createDeal;
