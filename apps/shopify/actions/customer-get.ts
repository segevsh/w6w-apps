import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient } from "../lib/client.ts";

const customerGet: ActionDefinition<{ customerId: number }> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a customer by id.",
  params: [{ key: "customerId", label: "Customer ID", type: "number", required: true }],
  output: [
    { key: "customer.id", type: "number", label: "Customer ID" },
    { key: "customer.email", type: "string", label: "Email" },
    { key: "customer.orders_count", type: "number", label: "Orders" },
    { key: "customer.total_spent", type: "string", label: "Total spent" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/customers/${input.customerId}.json`);
  },
};

export default customerGet;
