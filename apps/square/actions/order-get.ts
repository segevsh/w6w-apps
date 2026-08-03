import type { ActionDefinition } from "@w6w/types";
import { SquareClient } from "../lib/client.ts";

interface Input {
  orderId: string;
}

/** `GET /v2/orders/{order_id}` (RetrieveOrder). */
const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve one order — its line items, taxes, discounts, fulfilments and totals.",
  params: [
    {
      key: "orderId",
      label: "Order ID",
      type: "string",
      required: true,
      placeholder: "CAISEM82RcpmcFBM0TfOyiHV3es",
    },
  ],
  output: [
    { key: "order", type: "object", label: "Order" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request(`/orders/${encodeURIComponent(input.orderId)}`);
  },
};

export default orderGet;
