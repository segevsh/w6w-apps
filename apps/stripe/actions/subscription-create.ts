import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  priceId: string;
  quantity?: number;
  trialPeriodDays?: number;
  collectionMethod?: string;
  metadata?: unknown;
}

/**
 * A single-price subscription, which covers the common case. Stripe accepts an
 * `items[]` array for multi-price subscriptions — model that with a follow-up
 * action if it is needed rather than turning this form into a matrix.
 */
const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Subscribe a customer to a price.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "cus_…",
    },
    { key: "priceId", label: "Price ID", type: "string", required: true, placeholder: "price_…" },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "trialPeriodDays",
      label: "Trial days",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "Free trial before the first charge.",
    },
    {
      key: "collectionMethod",
      label: "Collection",
      type: "select",
      default: "charge_automatically",
      options: [
        { value: "charge_automatically", label: "Charge automatically" },
        { value: "send_invoice", label: "Send invoice" },
      ],
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "current_period_end", type: "number", label: "Period end (unix seconds)" },
    { key: "latest_invoice", type: "string", label: "Latest invoice ID" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request("/subscriptions", {
      form: {
        customer: input.customerId,
        items: [{ price: input.priceId, quantity: input.quantity }],
        trial_period_days: input.trialPeriodDays,
        collection_method: unset(input.collectionMethod),
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default subscriptionCreate;
