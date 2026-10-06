import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  order_id: number;
  format?: "light";
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description:
    "Fetch one order with its items, customer, shipping and payment. Needs the `orders.read` scope.",

  params: [
    {
      "key": "order_id",
      "label": "Order ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "format",
      "label": "Format",
      "type": "select",
      "hint": "`light` omits the heavier nested objects.",
      "options": [
        {
          "value": "light",
          "label": "light",
        },
      ],
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
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get(`/orders/${seg(input.order_id)}`, {
      format: input.format,
    });
  },
};

export default orderGet;
