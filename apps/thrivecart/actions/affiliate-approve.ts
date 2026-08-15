import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/**
 * `POST /affiliates/:affiliate_id/approve` — approve a pending application.
 * The vendor's own note: "if the application isn't already pending, no
 * changes will be made" — which is what makes retrying safe.
 */
interface Input {
  affiliateId: string;
  productIds: string[] | string;
  triggerEmails?: boolean;
  mode?: string;
}

const affiliateApprove: ActionDefinition<Input> = {
  key: "affiliate-approve",
  type: "perform",
  resource: "affiliate",
  title: "Approve Affiliate",
  description: "Approve an affiliate's pending application to one or more products.",
  idempotent: true,
  params: [
    affiliateIdParam,
    { key: "productIds", label: "Product IDs", type: "multiselect", required: true },
    { key: "triggerEmails", label: "Send emails", type: "boolean", default: true },
    modeParam,
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    const productIds = Array.isArray(input.productIds) ? input.productIds : [input.productIds];
    return new ThriveCartClient(ctx).post(
      `/affiliates/${encodeId(input.affiliateId)}/approve`,
      { form: { product_ids: productIds, trigger_emails: input.triggerEmails }, mode: input.mode },
    );
  },
};

export default affiliateApprove;
