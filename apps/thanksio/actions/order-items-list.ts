import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/orders/{orderId}/items` — one entry per recipient; `per_page` 1-100 and `page`. */
interface Input {
  orderId: string;
  perPage?: number;
  page?: number;
}

const orderItemsList: ActionDefinition<Input> = {
  key: "order-items-list",
  type: "read",
  resource: "order",
  title: "List Order Items",
  description: "List the individual mail pieces of an order, one per recipient, with delivery " +
    "status, delivery date, QR scan count, failure reason and recipient address.",
  params: [
    idParam("orderId", "Order ID"),
    {
      key: "perPage",
      label: "Items per page",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "1 to 100; a value outside that range is refused with a 422.",
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
  ],
  output: [
    { key: "items", type: "array", label: "Order items" },
    { key: "links", type: "object", label: "Pagination links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<
      { data?: unknown[]; links?: unknown; meta?: unknown }
    >(`/orders/${encodeId(input.orderId)}/items`, {
      query: { per_page: input.perPage, page: input.page },
    });
    return { items: body.data ?? [], links: body.links, meta: body.meta };
  },
};

export default orderItemsList;
