import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  affiliate_id: string;
  product_ids?: string;
}

const getAffiliateCommission: ActionDefinition<Input> = {
  key: "get-affiliate-commission",
  type: "read",
  title: "Get Affiliate Commission",
  description: "Return an affiliate's commission settings on your products.",
  params: [
    {
      key: "affiliate_id",
      label: "Affiliate",
      type: "string",
      required: true,
      hint: "The affiliate's ID or Digistore ID name.",
    },
    {
      key: "product_ids",
      label: "Product IDs",
      type: "string",
      hint: 'Comma-separated product IDs or "all" (default).',
    },
  ],
  output: [
    { key: "commissions", type: "array", label: "Commission settings" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "getAffiliateCommission",
      compact({ affiliate_id: input.affiliate_id, product_ids: input.product_ids }),
    );
  },
};

export default getAffiliateCommission;
