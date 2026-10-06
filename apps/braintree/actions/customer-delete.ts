import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";

interface Input {
  customerId: string;
}

/** `deleteCustomer`. */
const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Delete a customer and the payment methods stored under them.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of the customer.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when Braintree accepted the deletion" },
    { key: "customerId", type: "string", label: "The ID that was deleted" },
  ],

  async execute(input, ctx) {
    await new BraintreeClient(ctx).field(
      "deleteCustomer",
      `mutation DeleteCustomer($input: DeleteCustomerInput!) {
        deleteCustomer(input: $input) { clientMutationId }
      }`,
      { input: { customerId: input.customerId } },
    );
    return { deleted: true, customerId: input.customerId };
  },
};

export default customerDelete;
