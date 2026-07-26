import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  orderId: number;
  reason?: string;
  email?: boolean;
  restock?: boolean;
}

const orderCancel: ActionDefinition<Input> = {
  key: "order-cancel",
  type: "perform",
  resource: "order",
  title: "Cancel Order",
  description: "Cancel an order, optionally restocking its items and notifying the customer.",
  // An already-cancelled order is rejected rather than cancelled twice.
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "number", required: true },
    {
      key: "reason",
      label: "Reason",
      type: "select",
      options: [
        { value: "customer", label: "Customer changed their mind" },
        { value: "inventory", label: "Items unavailable" },
        { value: "fraud", label: "Fraudulent order" },
        { value: "declined", label: "Payment declined" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "restock", label: "Restock items", type: "boolean", row: "flags" },
    { key: "email", label: "Notify customer", type: "boolean", row: "flags" },
  ],
  output: [
    { key: "order.id", type: "number", label: "Order ID" },
    { key: "order.cancelled_at", type: "string", label: "Cancelled at" },
    { key: "order.cancel_reason", type: "string", label: "Reason" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/orders/${input.orderId}/cancel.json`, {
      method: "POST",
      body: { reason: unset(input.reason), email: input.email, restock: input.restock },
    });
  },
};

export default orderCancel;
