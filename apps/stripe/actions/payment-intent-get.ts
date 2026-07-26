import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";

const paymentIntentGet: ActionDefinition<{ paymentIntentId: string }> = {
  key: "payment-intent-get",
  type: "read",
  resource: "paymentIntent",
  title: "Get Payment Intent",
  description: "Retrieve a payment intent and its current status.",
  params: [
    {
      key: "paymentIntentId",
      label: "PaymentIntent ID",
      type: "string",
      required: true,
      placeholder: "pi_…",
    },
  ],
  output: [
    { key: "id", type: "string", label: "PaymentIntent ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount_received", type: "number", label: "Amount received" },
    { key: "latest_charge", type: "string", label: "Latest charge ID" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(
      `/payment_intents/${encodeURIComponent(input.paymentIntentId)}`,
    );
  },
};

export default paymentIntentGet;
