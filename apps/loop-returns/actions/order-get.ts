import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Get Order.
 *
 * `GET /orders/{id}` (Orders scope).
 */
interface Input {
  orderId: number;
}

const action: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch one order by Loop's order ID.",
  params: [
    {
      key: "orderId",
      label: "Order ID (Loop)",
      type: "number",
      required: true,
      hint: "Loop's numeric order id.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "order", type: "object", label: "The order" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).get(`/orders/${encodeId(input.orderId)}`) as Record<
      string,
      unknown
    >;
    return { order: res.order ?? res };
  },
};

export default action;
