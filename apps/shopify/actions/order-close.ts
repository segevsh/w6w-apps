import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient } from "../lib/client.ts";

interface Input {
  orderId: number;
  closed: boolean;
}

/**
 * Closing archives the order; it does not cancel or refund it — that is
 * `order-cancel`. Close and reopen are separate Shopify endpoints, folded into
 * one action with a boolean since they differ only in the last path segment.
 */
const orderClose: ActionDefinition<Input> = {
  key: "order-close",
  type: "perform",
  resource: "order",
  title: "Close or Reopen Order",
  description: "Archive an order, or reopen an archived one. Neither cancels nor refunds it.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "number", required: true },
    {
      key: "closed",
      label: "Closed",
      type: "boolean",
      required: true,
      default: true,
      hint: "On archives the order; off reopens it.",
    },
  ],
  output: [
    { key: "order.id", type: "number", label: "Order ID" },
    { key: "order.closed_at", type: "string", label: "Closed at" },
  ],

  execute(input, ctx) {
    const verb = input.closed ? "close" : "open";
    return new ShopifyClient(ctx).request(`/orders/${input.orderId}/${verb}.json`, {
      method: "POST",
    });
  },
};

export default orderClose;
