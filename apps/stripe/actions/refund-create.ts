import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { amount, metadataParam } from "../lib/params.ts";

interface Input {
  chargeId?: string;
  paymentIntentId?: string;
  amount?: number;
  reason?: string;
  metadata?: unknown;
}

const refundCreate: ActionDefinition<Input> = {
  key: "refund-create",
  type: "perform",
  resource: "refund",
  title: "Create Refund",
  description:
    "Refund a charge or payment intent, in full or in part. Give exactly one of the two ids.",
  // The invocation id becomes the Idempotency-Key, so a retried invocation
  // cannot refund the customer twice.
  idempotent: true,
  params: [
    { key: "chargeId", label: "Charge ID", type: "string", row: "target", placeholder: "ch_…" },
    {
      key: "paymentIntentId",
      label: "PaymentIntent ID",
      type: "string",
      row: "target",
      placeholder: "pi_…",
    },
    {
      ...amount("Amount", false),
      hint: "Defaults to the full amount. In the smallest currency unit — 1000 = $10.00.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "select",
      options: [
        { value: "duplicate", label: "Duplicate" },
        { value: "fraudulent", label: "Fraudulent" },
        { value: "requested_by_customer", label: "Requested by customer" },
      ],
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Refund ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount refunded" },
  ],

  execute(input, ctx) {
    const hasCharge = !!input.chargeId;
    const hasIntent = !!input.paymentIntentId;
    if (hasCharge === hasIntent) {
      throw new Error("Provide exactly one of `chargeId` or `paymentIntentId`.");
    }
    return new StripeClient(ctx).request("/refunds", {
      form: {
        charge: unset(input.chargeId),
        payment_intent: unset(input.paymentIntentId),
        amount: input.amount,
        reason: unset(input.reason),
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default refundCreate;
