import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /orders/{id}` — a single Order by its numeric id. */
const ordersGet: ActionDefinition<Input> = {
  key: "orders-get",
  type: "read",
  resource: "orders",
  title: "Get Order",
  description: "Fetch a single Order by id.",
  params: [idParam("Order")],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "user_id", type: "number", label: "User ID" },
    { key: "user_email", type: "string", label: "User email" },
    { key: "product_id", type: "number", label: "Product ID" },
    { key: "product_name", type: "string", label: "Product name" },
    {
      key: "amount_dollars",
      type: "string",
      label: "Order amount in dollars (vendor types this as a string)",
    },
    { key: "amount_cents", type: "number", label: "Order amount in cents" },
    { key: "subscription", type: "boolean", label: "Is a subscription order" },
    { key: "status", type: "string", label: "Order status" },
    { key: "items", type: "array", label: "Products included in the order" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).json(`/orders/${encodeURIComponent(input.id)}`);
  },
};

export default ordersGet;
