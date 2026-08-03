import type { ActionDefinition } from "@w6w/types";
import { ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  customerId: string;
}

/**
 * `GET /customers/{customer-id}` — retrieve one customer.
 *
 * The endpoint takes no query parameters at all, so this action has exactly one.
 * The response is `{ customer, card? }` — `card` is the customer's primary card
 * when one exists, which is why the output declares both rather than flattening
 * to the customer alone and quietly dropping it.
 */
const getCustomer: ActionDefinition<Input> = {
  key: "get-customer",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a single customer by id, with their primary card if one is on file.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "Chargebee's customer id, or the id you supplied when creating the customer.",
    },
  ],
  output: [
    { key: "customer", type: "object", label: "Customer" },
    { key: "card", type: "object", label: "Primary card, if any" },
  ],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request(`/customers/${pathId(input.customerId)}`);
  },
};

export default getCustomer;
