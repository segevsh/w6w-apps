import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/**
 * `GET /orders/{id}` — retrieve one order.
 *
 * Per the `get-order` reference, `id` accepts either the Tremendous-assigned
 * order id OR, when the order was created with one, its `external_id` —
 * useful for looking an order back up by the identifier a caller's own
 * system already tracks, without keeping Tremendous's id anywhere.
 */
interface Input {
  id: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve one order by its Tremendous ID or its external_id.",
  params: [
    {
      key: "id",
      label: "Order ID or external ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "order", type: "object", label: "The order" }],

  async execute(input, ctx) {
    const body = await new TremendousClient(ctx).json<{ order: unknown }>(
      `/orders/${encodeURIComponent(input.id)}`,
    );
    return body.order;
  },
};

export default orderGet;
