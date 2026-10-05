import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/orders/{orderId}/customer` */
interface Input {
  orderId: number;
}

const orderCustomerGet: ActionDefinition<Input> = {
  key: "order-customer-get",
  type: "read",
  resource: "order",
  title: "Get Order Customer",
  description: "The customer who placed an order.",
  params: [
    {
      "key": "orderId",
      "label": "Order ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Order id",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call(
      "GET",
      `/orders/${intId(input.orderId, "Order ID")}/customer`,
    );
  },
};

export default orderCustomerGet;
