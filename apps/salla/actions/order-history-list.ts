import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  order_id: number;
  page?: number;
}

const orderHistoryList: ActionDefinition<Input> = {
  key: "order-history-list",
  type: "search",
  resource: "order",
  title: "List Order History",
  description: "List the status history of an order. Needs the `orders.read` scope.",

  params: [
    {
      "key": "order_id",
      "label": "Order ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in `pagination` of the response.",
    },
  ],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "array",
      "label": "Records on this page",
    },
    {
      "key": "pagination",
      "type": "object",
      "label": "count, total, perPage, currentPage, totalPages, links",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get(`/orders/${seg(input.order_id)}/histories`, {
      page: input.page,
    });
  },
};

export default orderHistoryList;
