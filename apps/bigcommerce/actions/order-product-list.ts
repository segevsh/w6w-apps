import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

/**
 * `GET /v2/orders/{order_id}/products` — the line items on an order.
 *
 * The order object itself carries a *link* to this collection rather than the
 * lines, so this is a second call and not an optional one.
 *
 * Each line's `id` is the `order_product_id` that `order-shipment-create` needs,
 * which is the one relationship worth remembering here: it is **not** the
 * catalog `product_id`, and using the catalog id to build a shipment silently
 * ships the wrong line or nothing at all.
 */
interface Input {
  orderId: number;
  limit?: number;
  page?: number;
}

const orderProductList: ActionDefinition<Input, { products: unknown[] }> = {
  key: "order-product-list",
  type: "read",
  resource: "order",
  title: "List Order Products",
  description: "The line items on one order. Their `id` is the order_product_id used to ship them.",
  params: [
    orderIdParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 250 },
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
  ],
  output: [{ key: "products", type: "array", label: "Order line items" }],

  async execute(input, ctx) {
    const products = await new BigCommerceClient(ctx).v2List(
      `/orders/${encodeId(input.orderId)}/products`,
      { query: { limit: input.limit, page: input.page } },
    );
    return { products };
  },
};

export default orderProductList;
