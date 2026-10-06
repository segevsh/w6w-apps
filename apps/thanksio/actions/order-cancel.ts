import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `PUT /api/v2/orders/{orderId}/cancel` — only an order in Reviewing status can be cancelled. */
interface Input {
  orderId: string;
}

const orderCancel: ActionDefinition<Input> = {
  key: "order-cancel",
  type: "perform",
  resource: "order",
  title: "Cancel Order",
  description: "Cancel an order that is still in Reviewing status; its credits are refunded to " +
    "the account. An order that has moved past Reviewing cannot be cancelled.",
  idempotent: true,
  params: [idParam("orderId", "Order ID")],
  output: [{ key: "order", type: "object", label: "The order, status `cancelled`" }],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<{ order?: unknown }>(
      `/orders/${encodeId(input.orderId)}/cancel`,
      { method: "PUT" },
    );
    return { order: body.order };
  },
};

export default orderCancel;
