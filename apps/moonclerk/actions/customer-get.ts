import type { ActionDefinition } from "@w6w/types";
import { MoonClerkClient, seg } from "../lib/client.ts";

interface Input {
  customerId: number;
}

/** `GET /customers/:id` — one customer ("Plan"), wrapped as `{ "customer": {...} }`. */
const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description:
    "Fetch one customer (MoonClerk 'Plan') by ID, with its subscription, plan, discount, checkout and custom-field answers.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "number",
      required: true,
      hint: "From List Customers, or a payment's `customer_id`.",
      validation: { integer: true },
    },
  ],
  output: [{ key: "customer", type: "object", label: "Customer" }],

  async execute(input, ctx) {
    return {
      customer: await new MoonClerkClient(ctx).one(
        `/customers/${seg(input.customerId)}`,
        "customer",
      ),
    };
  },
};

export default customerGet;
