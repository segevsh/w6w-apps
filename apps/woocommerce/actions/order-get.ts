import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  orderId: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve a single order by ID.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "number", type: "string", label: "Order Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "total", type: "string", label: "Total" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "payment_method", type: "string", label: "Payment Method" },
    { key: "line_items", type: "array", label: "Line Items" },
    { key: "date_created", type: "string", label: "Date Created" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request(`/orders/${input.orderId}`);
  },
};

export default orderGet;
