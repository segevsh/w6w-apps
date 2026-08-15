import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/**
 * `POST /affiliates/:affiliate_id/register` — register an existing affiliate
 * for one or more products. Treated as idempotent: it sets registration
 * state for a named affiliate/product pair rather than creating a new
 * resource each call.
 */
interface Input {
  affiliateId: string;
  productIds: string[] | string;
  autoApprove?: boolean;
  triggerEmails?: boolean;
  parentAffiliate?: string;
  mode?: string;
}

const affiliateRegister: ActionDefinition<Input> = {
  key: "affiliate-register",
  type: "perform",
  resource: "affiliate",
  title: "Register Affiliate For Product",
  description: "Register an existing affiliate for one or more products.",
  idempotent: true,
  params: [
    affiliateIdParam,
    { key: "productIds", label: "Product IDs", type: "multiselect", required: true },
    { key: "autoApprove", label: "Auto-approve", type: "boolean" },
    { key: "triggerEmails", label: "Send emails", type: "boolean", default: true },
    { key: "parentAffiliate", label: "Referred by (affiliate ID)", type: "string" },
    modeParam,
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    const productIds = Array.isArray(input.productIds) ? input.productIds : [input.productIds];
    return new ThriveCartClient(ctx).post(
      `/affiliates/${encodeId(input.affiliateId)}/register`,
      {
        form: {
          product_ids: productIds,
          auto_approve: input.autoApprove,
          trigger_emails: input.triggerEmails,
          parent_affiliate: input.parentAffiliate,
        },
        mode: input.mode,
      },
    );
  },
};

export default affiliateRegister;
