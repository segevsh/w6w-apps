import type { ActionDefinition } from "@w6w/types";
import { HyrosClient } from "../lib/client.ts";

interface Input {
  orderId: string;
  refundedAmount?: string;
}

const orderRefund: ActionDefinition<Input> = {
  key: "order-refund",
  type: "perform",
  resource: "order",
  title: "Refund Order",
  description: "Refund an order (fully, or by an amount) and reduce the lead's income.",
  idempotent: false,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    {
      key: "refundedAmount",
      label: "Refunded amount",
      type: "string",
      hint: "Leave empty to refund the whole order.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    return new HyrosClient(ctx).write("DELETE", `/orders/${encodeURIComponent(input.orderId)}`, {
      query: { refundedAmount: input.refundedAmount },
    });
  },
};

export default orderRefund;
