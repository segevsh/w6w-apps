import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";
import { PAYMENT_METHOD_FIELDS } from "../lib/selections.ts";
import { PAYMENT_METHOD_OUTPUT } from "../lib/payment-methods.ts";

interface Input {
  paymentMethodId: string;
}

/** `node(id)` narrowed to `PaymentMethod`. */
const paymentMethodGet: ActionDefinition<Input> = {
  key: "payment-method-get",
  type: "read",
  resource: "payment-method",
  title: "Get Payment Method",
  description:
    "Fetch a payment method by GraphQL ID: usage, owning customer and masked card, PayPal, Venmo or bank details.",
  params: [
    {
      key: "paymentMethodId",
      label: "Payment method ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of a vaulted payment method.",
    },
  ],
  output: PAYMENT_METHOD_OUTPUT,

  async execute(input, ctx) {
    const data = await new BraintreeClient(ctx).execute<{ node?: Record<string, unknown> | null }>(
      `query GetPaymentMethod($id: ID!) { node(id: $id) { ... on PaymentMethod { ${PAYMENT_METHOD_FIELDS} } } }`,
      { id: input.paymentMethodId },
    );
    if (!data.node || !data.node.id) {
      throw new Error(`Braintree: no payment method found for id ${input.paymentMethodId}`);
    }
    return data.node;
  },
};

export default paymentMethodGet;
