import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  orderId: string;
}

/** `GET /ecom/v1/orders/{id}` — handler `wix.ecom.v1.order:GetOrder`. */
const getOrder: ActionDefinition<Input> = {
  key: "get-order",
  type: "read",
  resource: "order",
  title: "Get Order",
  description:
    "Retrieve a single eCommerce order by id, including line items, buyer info, totals and payment status.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
  ],
  output: [{ key: "order", type: "object", label: "Order" }],

  execute(input, ctx) {
    return new WixClient(ctx).request(`/ecom/v1/orders/${encodeURIComponent(input.orderId)}`);
  },
};

export default getOrder;
