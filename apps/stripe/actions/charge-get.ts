import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

const chargeGet: ActionDefinition<{ chargeId: string }> = {
  key: "charge-get",
  type: "read",
  resource: "charge",
  title: "Get Charge",
  description: "Retrieve a charge by id.",
  params: [
    { key: "chargeId", label: "Charge ID", type: "string", required: true, placeholder: "ch_…" },
  ],
  output: [
    { key: "id", type: "string", label: "Charge ID" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "Status" },
    { key: "refunded", type: "boolean", label: "Refunded" },
    { key: "receipt_url", type: "string", label: "Receipt URL" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(`/charges/${encodeURIComponent(input.chargeId)}`);
  },
};

export default chargeGet;
