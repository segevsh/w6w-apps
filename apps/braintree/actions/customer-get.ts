import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";
import { CUSTOMER_FIELDS, PAYMENT_METHOD_FIELDS } from "../lib/selections.ts";
import { CUSTOMER_OUTPUT } from "../lib/customers.ts";

interface Input {
  customerId: string;
}

/** `node(id)` narrowed to `Customer`, with the first page of stored payment methods. */
const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a customer by GraphQL ID, including up to 50 stored payment methods.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "GraphQL ID. Convert a legacy id with the Convert Legacy IDs action.",
    },
  ],
  output: [
    ...CUSTOMER_OUTPUT,
    { key: "defaultPaymentMethod", type: "object", label: "Default payment method" },
    { key: "paymentMethods", type: "array", label: "Stored payment methods (first 50)" },
  ],

  async execute(input, ctx) {
    const data = await new BraintreeClient(ctx).execute<{ node?: Record<string, unknown> | null }>(
      `query GetCustomer($id: ID!) {
        node(id: $id) {
          ... on Customer {
            ${CUSTOMER_FIELDS}
            defaultPaymentMethod { id legacyId usage }
            paymentMethods(first: 50) { edges { node { ${PAYMENT_METHOD_FIELDS} } } }
          }
        }
      }`,
      { id: input.customerId },
    );
    const node = data.node;
    if (!node || !node.id) {
      throw new Error(`Braintree: no customer found for id ${input.customerId}`);
    }
    const conn = node.paymentMethods as { edges?: Array<{ node?: unknown } | null> } | null;
    return {
      ...node,
      paymentMethods: (conn?.edges ?? []).map((e) => e?.node).filter(Boolean),
    };
  },
};

export default customerGet;
