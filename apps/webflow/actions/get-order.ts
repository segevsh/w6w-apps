import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  siteId: string;
  orderId: string;
}

/** GET /sites/{site_id}/orders/{order_id} — fetch a single e-commerce order. */
const getOrder: ActionDefinition<Input> = {
  key: "get-order",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch a single order from an e-commerce site.",
  params: [
    { key: "siteId", label: "Site ID", type: "string", required: true },
    { key: "orderId", label: "Order ID", type: "string", required: true },
  ],
  output: [
    { key: "orderId", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "comment", type: "string", label: "Comment" },
    { key: "acceptedOn", type: "string", label: "Accepted on" },
    { key: "fulfilledOn", type: "string", label: "Fulfilled on" },
    { key: "customerPaid", type: "object", label: "Customer paid" },
    { key: "netAmount", type: "object", label: "Net amount" },
    { key: "customerInfo", type: "object", label: "Customer info" },
    { key: "shippingAddress", type: "object", label: "Shipping address" },
    { key: "purchasedItems", type: "array", label: "Purchased items" },
    { key: "totals", type: "object", label: "Totals" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(
      `/sites/${encodeURIComponent(input.siteId)}/orders/${encodeURIComponent(input.orderId)}`,
    );
  },
};

export default getOrder;
