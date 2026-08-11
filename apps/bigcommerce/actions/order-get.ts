import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId, toList } from "../lib/client.ts";
import { orderIdParam, orderIncludeOptions } from "../lib/params.ts";

/**
 * `GET /v2/orders/{order_id}` — one order.
 *
 * The response is the order object itself, not `{data: …}`: v2 has no envelope.
 * Several of its fields are URLs to sub-resources (`products`, `shipping_addresses`,
 * `coupons`) rather than the data — fetch those with `order-product-list` and
 * `order-shipping-address-list`.
 */
interface Input {
  orderId: number;
  include?: string[];
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch one order by ID.",
  params: [
    orderIdParam,
    {
      key: "include",
      label: "Include sub-resources",
      type: "multiselect",
      options: orderIncludeOptions,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "total_inc_tax", type: "string", label: "Total including tax" },
    { key: "customer_id", type: "number", label: "Customer ID" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v2(`/orders/${encodeId(input.orderId)}`, {
      query: { include: toList(input.include) },
    });
  },
};

export default orderGet;
