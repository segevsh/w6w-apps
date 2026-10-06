import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";
import { CUSTOMER_FIELDS } from "../lib/selections.ts";
import {
  CUSTOMER_OUTPUT,
  customerFieldParams,
  type CustomerFields,
  customerInput,
} from "../lib/customers.ts";

/** `createCustomer`. */
const customerCreate: ActionDefinition<CustomerFields> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer record in the vault. Every field is optional.",
  idempotent: false,
  params: customerFieldParams,
  output: CUSTOMER_OUTPUT,

  async execute(input, ctx) {
    const payload = await new BraintreeClient(ctx).field<
      { customer: Record<string, unknown> | null }
    >(
      "createCustomer",
      `mutation CreateCustomer($input: CreateCustomerInput) {
        createCustomer(input: $input) { customer { ${CUSTOMER_FIELDS} } }
      }`,
      { input: { customer: customerInput(input) } },
    );
    return payload.customer ?? {};
  },
};

export default customerCreate;
