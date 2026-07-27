import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  siteId: string;
  orderId: string;
  comment?: string;
  shippingProvider?: string;
  shippingTracking?: string;
  shippingTrackingURL?: string;
}

/**
 * PATCH /sites/{site_id}/orders/{order_id} — update the API-editable fields on
 * an order: the merchant `comment` and the shipping provider / tracking details.
 * Only the fields supplied are sent.
 */
const updateOrder: ActionDefinition<Input> = {
  key: "update-order",
  type: "perform",
  resource: "order",
  title: "Update Order",
  description: "Update an order's comment and shipping details.",
  idempotent: true,
  params: [
    { key: "siteId", label: "Site ID", type: "string", required: true },
    { key: "orderId", label: "Order ID", type: "string", required: true },
    { key: "comment", label: "Comment", type: "text" },
    { key: "shippingProvider", label: "Shipping provider", type: "string" },
    { key: "shippingTracking", label: "Shipping tracking number", type: "string" },
    { key: "shippingTrackingURL", label: "Shipping tracking URL", type: "string" },
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
    const body: Record<string, unknown> = {};
    if (input.comment !== undefined) body.comment = input.comment;
    if (input.shippingProvider !== undefined) body.shippingProvider = input.shippingProvider;
    if (input.shippingTracking !== undefined) body.shippingTracking = input.shippingTracking;
    if (input.shippingTrackingURL !== undefined) {
      body.shippingTrackingURL = input.shippingTrackingURL;
    }
    return client.request(
      `/sites/${encodeURIComponent(input.siteId)}/orders/${encodeURIComponent(input.orderId)}`,
      { method: "PATCH", body },
    );
  },
};

export default updateOrder;
