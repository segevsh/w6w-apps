import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/orders/{orderId}/track` — `{data: {id, order, stats{delivered, printed, …}}}`. */
interface Input {
  orderId: string;
}

const orderTrack: ActionDefinition<Input> = {
  key: "order-track",
  type: "read",
  resource: "order",
  title: "Track Order",
  description: "Get an order with its delivery summary: counts of pieces delivered, printed, " +
    "in transit, returned or failed, and QR scans.",
  params: [idParam("orderId", "Order ID")],
  output: [
    { key: "order", type: "object", label: "The order" },
    { key: "stats", type: "object", label: "Delivery statistics" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<
      { data?: { order?: unknown; stats?: unknown } }
    >(`/orders/${encodeId(input.orderId)}/track`);
    return { order: body.data?.order, stats: body.data?.stats };
  },
};

export default orderTrack;
