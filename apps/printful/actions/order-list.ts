import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  status?: string;
  offset?: number;
  limit?: number;
}

/** `GET /orders` — List the store's orders, optionally by status. */
const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "List the store's orders, optionally by status.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Filter by order status, e.g. `draft`, `pending`, `fulfilled`, `canceled`.",
    },
    offsetParam,
    limitParam,
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    const { items, paging } = await new PrintfulClient(ctx).list("/orders", {
      query: { status: input.status, offset: input.offset, limit: input.limit },
    });
    return { orders: items, ...(paging ? { paging } : {}) };
  },
};

export default orderList;
