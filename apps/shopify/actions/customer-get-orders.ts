import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  customerId: number;
  status?: string;
}

const customerGetOrders: ActionDefinition<Input> = {
  key: "customer-get-orders",
  type: "read",
  resource: "customer",
  title: "Get Customer Orders",
  description: "List the orders belonging to one customer.",
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "any",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "any", label: "Any" },
      ],
    },
  ],
  output: [{ key: "orders", type: "array", label: "Orders" }],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/customers/${input.customerId}/orders.json`, {
      query: { status: unset(input.status) },
    });
  },
};

export default customerGetOrders;
