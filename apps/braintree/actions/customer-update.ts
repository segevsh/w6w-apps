import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";
import { CUSTOMER_FIELDS } from "../lib/selections.ts";
import {
  CUSTOMER_OUTPUT,
  customerFieldParams,
  type CustomerFields,
  customerInput,
} from "../lib/customers.ts";

interface Input extends CustomerFields {
  customerId: string;
}

/** `updateCustomer` — only the fields you set are sent. */
const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Update a customer's contact details or custom fields. Unset fields are left as they are.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "GraphQL ID of the customer.",
    },
    ...customerFieldParams,
  ],
  output: CUSTOMER_OUTPUT,

  async execute(input, ctx) {
    const payload = await new BraintreeClient(ctx).field<
      { customer: Record<string, unknown> | null }
    >(
      "updateCustomer",
      `mutation UpdateCustomer($input: UpdateCustomerInput!) {
        updateCustomer(input: $input) { customer { ${CUSTOMER_FIELDS} } }
      }`,
      { input: { customerId: input.customerId, customer: customerInput(input) } },
    );
    return payload.customer ?? {};
  },
};

export default customerUpdate;
