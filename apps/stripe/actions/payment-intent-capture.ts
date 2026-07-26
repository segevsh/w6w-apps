import type { ActionDefinition } from "@w6w/types";
import { StripeClient } from "../lib/client.ts";
import { amount } from "../lib/params.ts";

interface Input {
  paymentIntentId: string;
  amount?: number;
}

/**
 * Only applies to intents created with `capture_method: manual`. Capturing
 * less than the authorised amount releases the rest.
 */
const paymentIntentCapture: ActionDefinition<Input> = {
  key: "payment-intent-capture",
  type: "perform",
  resource: "paymentIntent",
  title: "Capture Payment Intent",
  description:
    "Capture a manually-captured payment intent. Capturing less than authorised releases the remainder.",
  idempotent: true,
  params: [
    {
      key: "paymentIntentId",
      label: "PaymentIntent ID",
      type: "string",
      required: true,
      placeholder: "pi_…",
    },
    {
      ...amount("Amount to capture", false),
      hint:
        "Defaults to the full authorised amount. In the smallest currency unit — 1000 = $10.00.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "PaymentIntent ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount_received", type: "number", label: "Amount received" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(
      `/payment_intents/${encodeURIComponent(input.paymentIntentId)}/capture`,
      { form: { amount_to_capture: input.amount } },
    );
  },
};

export default paymentIntentCapture;
