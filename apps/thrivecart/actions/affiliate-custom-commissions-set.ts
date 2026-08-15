import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/**
 * `POST /affiliates/:affiliate_id/custom_commissions` — override an
 * affiliate's commission rules for one product. The vendor documents no
 * schema for the commission object itself beyond "see our example SDK" —
 * this action passes the caller's JSON through verbatim rather than
 * inventing a shape. Idempotent: it is a set/replace operation, and an
 * explicit `null` removes the override.
 */
interface Input {
  affiliateId: string;
  productId: string;
  commissionObject?: unknown;
  mode?: string;
}

const affiliateCustomCommissionsSet: ActionDefinition<Input> = {
  key: "affiliate-custom-commissions-set",
  type: "perform",
  resource: "affiliate",
  title: "Set Affiliate Custom Commissions",
  description: "Override an affiliate's commission rules for one product, or clear the override.",
  idempotent: true,
  params: [
    affiliateIdParam,
    { key: "productId", label: "Product ID", type: "string", required: true },
    {
      key: "commissionObject",
      label: "Custom commissions",
      type: "json",
      hint: "Leave empty / null to remove any custom commissions set for this product. See " +
        "ThriveCart's example SDK for the object shape — it is not documented in the API " +
        "reference.",
    },
    modeParam,
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post(
      `/affiliates/${encodeId(input.affiliateId)}/custom_commissions`,
      {
        form: {
          product_id: input.productId,
          commission_object: input.commissionObject === undefined
            ? undefined
            : JSON.stringify(input.commissionObject),
        },
        mode: input.mode,
      },
    );
  },
};

export default affiliateCustomCommissionsSet;
