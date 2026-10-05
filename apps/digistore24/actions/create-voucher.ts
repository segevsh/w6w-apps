import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  code: string;
  product_ids?: string;
  valid_from?: string;
  expires_at?: string;
  first_rate?: number;
  other_rates?: number;
  first_amount?: number;
  other_amounts?: number;
  currency?: string;
  is_count_limited?: boolean;
  count_left?: number;
  upgrade_policy?: "valid" | "other_only" | "not_valid";
}

const createVoucher: ActionDefinition<Input> = {
  key: "create-voucher",
  type: "perform",
  resource: "voucher",
  title: "Create Voucher",
  description: "Create a discount voucher code.",
  idempotent: false,
  params: [
    { key: "code", label: "Voucher code", type: "string", required: true },
    {
      key: "product_ids",
      label: "Product IDs",
      type: "string",
      hint: 'Comma-separated product IDs, or "all".',
    },
    { key: "valid_from", label: "Valid from", type: "string", hint: "e.g. 2026-12-31 12:00:00." },
    { key: "expires_at", label: "Expires at", type: "string", hint: "e.g. 2027-12-31 12:00:00." },
    { key: "first_rate", label: "First payment discount (%)", type: "number" },
    { key: "other_rates", label: "Follow-up payment discount (%)", type: "number" },
    { key: "first_amount", label: "First payment discount amount", type: "number" },
    { key: "other_amounts", label: "Follow-up payment discount amount", type: "number" },
    { key: "currency", label: "Currency", type: "string", hint: "For the fixed discount amounts." },
    { key: "is_count_limited", label: "Limit number of uses", type: "boolean" },
    { key: "count_left", label: "Uses left", type: "number" },
    {
      key: "upgrade_policy",
      label: "Upgrade policy",
      type: "select",
      options: [{ value: "valid", label: "valid" }, { value: "other_only", label: "other_only" }, {
        value: "not_valid",
        label: "not_valid",
      }],
    },
  ],
  output: [
    { key: "discount_code_id", type: "number", label: "Voucher ID" },
    { key: "code", type: "string", label: "Voucher code" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "createVoucher",
      compact({
        code: input.code,
        product_ids: input.product_ids,
        valid_from: input.valid_from,
        expires_at: input.expires_at,
        first_rate: input.first_rate,
        other_rates: input.other_rates,
        first_amount: input.first_amount,
        other_amounts: input.other_amounts,
        currency: input.currency,
        is_count_limited: input.is_count_limited,
        count_left: input.count_left,
        upgrade_policy: input.upgrade_policy,
      }),
      { write: true },
    );
  },
};

export default createVoucher;
