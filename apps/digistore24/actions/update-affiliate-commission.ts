import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  affiliate_id: string;
  product_ids: string;
  commission_rate?: number;
  commission_fix?: number;
  commission_currency?: string;
  is_on_first_pmnt_only?: boolean;
  approval_status?: "new" | "approved" | "rejected" | "pending";
  can_overpay?: "N" | "N_per_unit" | "Y" | "Y_per_unit";
}

const updateAffiliateCommission: ActionDefinition<Input> = {
  key: "update-affiliate-commission",
  type: "perform",
  resource: "affiliate",
  title: "Update Affiliate Commission",
  description:
    "Set an affiliate's commission on one or more of your products. Products without an affiliation get one created; with product IDs = all only existing affiliations change.",
  idempotent: true,
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
      required: true,
      hint: 'Comma-separated product IDs, or "all" for every existing affiliation.',
    },
    { key: "commission_rate", label: "Commission rate (%)", type: "number", hint: "0 to 100." },
    {
      key: "commission_fix",
      label: "Fixed commission",
      type: "number",
      hint: "In the fixed commission currency.",
    },
    { key: "commission_currency", label: "Fixed commission currency", type: "string" },
    {
      key: "is_on_first_pmnt_only",
      label: "Fixed commission on first payment only",
      type: "boolean",
    },
    {
      key: "approval_status",
      label: "Approval status",
      type: "select",
      options: [{ value: "new", label: "new" }, { value: "approved", label: "approved" }, {
        value: "rejected",
        label: "rejected",
      }, { value: "pending", label: "pending" }],
    },
    {
      key: "can_overpay",
      label: "Can overpay",
      type: "select",
      options: [{ value: "N", label: "N" }, { value: "N_per_unit", label: "N_per_unit" }, {
        value: "Y",
        label: "Y",
      }, { value: "Y_per_unit", label: "Y_per_unit" }],
    },
  ],
  output: [
    { key: "modified", type: "string", label: "Y if anything changed" },
    { key: "modified_product_ids", type: "array", label: "Products changed" },
    { key: "created_product_ids", type: "array", label: "Affiliations created" },
    { key: "hint", type: "string", label: "Vendor hint" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "updateAffiliateCommission",
      compact({
        affiliate_id: input.affiliate_id,
        product_ids: input.product_ids,
        data: compact({
          commission_rate: input.commission_rate,
          commission_fix: input.commission_fix,
          commission_currency: input.commission_currency,
          is_on_first_pmnt_only: input.is_on_first_pmnt_only,
          approval_status: input.approval_status,
          can_overpay: input.can_overpay,
        }),
      }),
      { write: true },
    );
  },
};

export default updateAffiliateCommission;
