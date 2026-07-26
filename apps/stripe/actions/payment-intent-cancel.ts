import type { ActionDefinition } from "@w6w/types";
import { StripeClient, unset } from "../lib/client.ts";

interface Input {
  paymentIntentId: string;
  cancellationReason?: string;
}

const paymentIntentCancel: ActionDefinition<Input> = {
  key: "payment-intent-cancel",
  type: "perform",
  resource: "paymentIntent",
  title: "Cancel Payment Intent",
  description:
    "Cancel a payment intent that has not been captured. A captured payment must be refunded instead.",
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
      key: "cancellationReason",
      label: "Reason",
      type: "select",
      options: [
        { value: "duplicate", label: "Duplicate" },
        { value: "fraudulent", label: "Fraudulent" },
        { value: "requested_by_customer", label: "Requested by customer" },
        { value: "abandoned", label: "Abandoned" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "PaymentIntent ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "cancellation_reason", type: "string", label: "Reason" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request(
      `/payment_intents/${encodeURIComponent(input.paymentIntentId)}/cancel`,
      { form: { cancellation_reason: unset(input.cancellationReason) } },
    );
  },
};

export default paymentIntentCancel;
