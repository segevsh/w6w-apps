import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/**
 * `POST /affiliates/:affiliate_id/reject` — reject a pending application.
 * Same no-op-if-not-pending behavior as Approve, per the vendor's docs.
 */
interface Input {
  affiliateId: string;
  productIds: string[] | string;
  triggerEmails?: boolean;
  mode?: string;
}

const affiliateReject: ActionDefinition<Input> = {
  key: "affiliate-reject",
  type: "perform",
  resource: "affiliate",
  title: "Reject Affiliate",
  description: "Reject an affiliate's pending application to one or more products.",
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
      `/affiliates/${encodeId(input.affiliateId)}/reject`,
      { form: { product_ids: productIds, trigger_emails: input.triggerEmails }, mode: input.mode },
    );
  },
};

export default affiliateReject;
