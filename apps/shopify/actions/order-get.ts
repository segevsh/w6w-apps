import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  orderId: number;
  fields?: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch an order by id.",
  params: [
    { key: "orderId", label: "Order ID", type: "number", required: true },
    { key: "fields", label: "Fields", type: "string", hint: "Comma-separated field list." },
  ],
  output: [
    { key: "order.id", type: "number", label: "Order ID" },
    { key: "order.name", type: "string", label: "Order name (e.g. #1001)" },
    { key: "order.financial_status", type: "string", label: "Financial status" },
    { key: "order.fulfillment_status", type: "string", label: "Fulfillment status" },
    { key: "order.total_price", type: "string", label: "Total" },
    { key: "order.line_items", type: "array", label: "Line items" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/orders/${input.orderId}.json`, {
      query: { fields: unset(input.fields) },
    });
  },
};

export default orderGet;
