import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId } from "../lib/client.ts";
import { orderIdParam, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /orders/{orderId}` — one order in full.
 *
 * The vendored page types `orderId` as a number and then says it "can contain
 * prefixes and suffixes, for example: `EG4H2,J77J8`" — and its own search
 * example answers `"id": "EBJFT"`. The id is therefore a string here, and it is
 * the *public* order id, not the `internalId` a search result also carries.
 *
 * A search result is already a projection of this response, so this call is for
 * the parts a search truncates: the item list, the tax breakdown, the shipping
 * and billing persons, `extraFields`, and the private admin fields.
 */
interface Input {
  orderId: string;
  responseFields?: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch one order with its items, addresses, totals and statuses.",
  params: [orderIdParam, responseFieldsParam],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "orderNumber", type: "number", label: "Human-facing order number" },
    { key: "email", type: "string", label: "Customer email" },
    { key: "total", type: "number", label: "Order total" },
    { key: "paymentStatus", type: "string", label: "Payment status" },
    { key: "fulfillmentStatus", type: "string", label: "Fulfillment status" },
    { key: "items", type: "array", label: "Ordered items" },
    { key: "billingPerson", type: "object", label: "Billing name and address" },
    { key: "shippingPerson", type: "object", label: "Shipping name and address" },
    { key: "createDate", type: "string", label: "When the order was placed" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json(`/orders/${encodeId(input.orderId)}`, {
      query: { responseFields: input.responseFields },
    });
  },
};

export default orderGet;
