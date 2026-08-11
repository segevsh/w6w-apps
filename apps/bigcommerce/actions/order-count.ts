import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient } from "../lib/client.ts";

/**
 * `GET /v2/orders/count` — how many orders, broken down by status.
 *
 * This endpoint exists because the v2 list cannot answer it: `GET /v2/orders`
 * returns a bare array with no pagination metadata, so there is no `total` to
 * read. Call this first if you need to know how many pages you are about to walk.
 *
 * The response is `{count, statuses: [{id, name, system_label, custom_label,
 * count}]}` — the per-status counts come free with the total, which makes it the
 * cheapest "how many orders are awaiting fulfilment" in the API.
 */
interface Input {
  statusId?: number;
  customerId?: number;
  channelId?: number;
  minDateCreated?: string;
}

const orderCount: ActionDefinition<Input> = {
  key: "order-count",
  type: "read",
  resource: "order",
  title: "Count Orders",
  description: "Total order count plus a per-status breakdown, optionally filtered.",
  params: [
    { key: "statusId", label: "Status ID", type: "number", validation: { integer: true } },
    { key: "customerId", label: "Customer ID", type: "number", validation: { integer: true } },
    { key: "channelId", label: "Channel ID", type: "number", validation: { integer: true } },
    { key: "minDateCreated", label: "Created after", type: "string", advanced: true },
  ],
  output: [
    { key: "count", type: "number", label: "Total orders" },
    { key: "statuses", type: "array", label: "Per-status counts" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v2("/orders/count", {
      query: {
        status_id: input.statusId,
        customer_id: input.customerId,
        channel_id: input.channelId,
        min_date_created: input.minDateCreated,
      },
    });
  },
};

export default orderCount;
