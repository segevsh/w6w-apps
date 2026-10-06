import type { ActionDefinition } from "@w6w/types";
import { compact, seg, UscreenClient } from "../lib/client.ts";
import { CUSTOMER_ID } from "../lib/params.ts";

interface Input {
  customerId: string;
  productId: number;
  performActionAt?: number;
  withManualBilling?: boolean;
  currency?: string;
  coverFees?: boolean;
  skipAutomations?: boolean;
}

const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Start a subscription for a customer on a subscription plan.",
  idempotent: false,
  params: [
    CUSTOMER_ID(""),
    {
      "key": "productId",
      "label": "Subscription plan ID",
      "type": "number",
      "required": true,
      "validation": { "integer": true },
    },
    {
      "key": "performActionAt",
      "label": "Next billing at (Unix seconds)",
      "type": "number",
      "hint": "Next billing/renewal date. Omit with manual billing.",
    },
    {
      "key": "withManualBilling",
      "label": "Manual billing",
      "type": "boolean",
      "hint": "Process billing outside Uscreen; do not send a next billing date.",
    },
    {
      "key": "currency",
      "label": "Currency",
      "type": "string",
      "hint":
        "ISO 4217 code; must be one of the store's configured currencies. Default: the store's.",
    },
    {
      "key": "coverFees",
      "label": "Cover fees",
      "type": "boolean",
      "hint":
        "Add transaction fees to the price, paid by the customer. Needs cover-my-fees enabled.",
    },
    {
      "key": "skipAutomations",
      "label": "Skip automations",
      "type": "boolean",
      "hint": "True to skip automation enrollment such as subscription_assigned.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "POST",
      `/customers/${seg(input.customerId)}/subscription`,
      {
        body: compact({
          "product_id": input.productId,
          "with_manual_billing": input.withManualBilling,
          "perform_action_at": input.performActionAt,
          "currency": input.currency,
          "cover_fees": input.coverFees,
          "skip_automations": input.skipAutomations,
        }),
      },
    )) ?? {};
  },
};

export default subscriptionCreate;
