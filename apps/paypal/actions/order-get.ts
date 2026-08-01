import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/** Get order details. Wraps `GET /v2/checkout/orders/{id}`. */
const action: ActionDefinition = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get an order",
  description: "Show details for an order, by ID.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "intent", type: "string", label: "Intent (CAPTURE or AUTHORIZE)" },
    { key: "links", type: "array", label: "HATEOAS links" },
  ],

  async execute(input, ctx) {
    const orderId = String((input as Record<string, unknown>).orderId ?? "").trim();
    if (!orderId) throw new Error("`orderId` is required");
    return await new PayPalClient(ctx).request(`/v2/checkout/orders/${orderId}`);
  },
};

export default action;
