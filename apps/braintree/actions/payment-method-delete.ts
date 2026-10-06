import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";

interface Input {
  paymentMethodId: string;
}

/** `deletePaymentMethodFromVault`. */
const paymentMethodDelete: ActionDefinition<Input> = {
  key: "payment-method-delete",
  type: "perform",
  resource: "payment-method",
  title: "Delete Payment Method",
  description: "Remove a payment method from the vault. It can no longer be charged.",
  idempotent: true,
  params: [
    {
      key: "paymentMethodId",
      label: "Payment method ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of a vaulted payment method.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when Braintree accepted the deletion" },
    { key: "paymentMethodId", type: "string", label: "The ID that was deleted" },
  ],

  async execute(input, ctx) {
    await new BraintreeClient(ctx).field(
      "deletePaymentMethodFromVault",
      `mutation DeletePaymentMethod($input: DeletePaymentMethodFromVaultInput!) {
        deletePaymentMethodFromVault(input: $input) { clientMutationId }
      }`,
      { input: { paymentMethodId: input.paymentMethodId } },
    );
    return { deleted: true, paymentMethodId: input.paymentMethodId };
  },
};

export default paymentMethodDelete;
