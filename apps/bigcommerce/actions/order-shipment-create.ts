import type { ActionDefinition } from "@w6w/types";
import { asJson, BigCommerceClient, compact, encodeId } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

/**
 * `POST /v2/orders/{order_id}/shipments` — mark part or all of an order shipped.
 *
 * The two ids in the body come from two other calls and are easy to swap:
 *
 *  - `order_address_id` is the `id` of an entry from `order-shipping-address-list`.
 *  - `items[].order_product_id` is the `id` of a line from `order-product-list`
 *    — **not** the catalog `product_id`.
 *
 * Vendor facts worth knowing before wiring this into a workflow:
 *
 *  - **This sends email.** "Creating order shipments triggers email
 *    notifications", governed by the store's Order Notification settings.
 *  - Ship a subset by listing only some lines and quantities; call it again for
 *    the rest.
 *  - Deleting a shipment does **not** move the order back out of `shipped`.
 *  - The success status here is **201**, unlike `POST /v3/catalog/products`,
 *    which answers 200. BigCommerce is not consistent about this and the client
 *    does not care, but code downstream of it might.
 */
interface Input {
  orderId: number;
  orderAddressId: number;
  items: unknown;
  trackingNumber?: string;
  shippingProvider?: string;
  trackingCarrier?: string;
  shippingMethod?: string;
  comments?: string;
}

const orderShipmentCreate: ActionDefinition<Input> = {
  key: "order-shipment-create",
  type: "perform",
  resource: "order",
  title: "Create Order Shipment",
  description:
    "Ship some or all of an order's lines. Triggers the store's shipment notification email.",
  // A repeat ships the same lines a second time and emails the customer again.
  idempotent: false,
  params: [
    orderIdParam,
    {
      key: "orderAddressId",
      label: "Order address ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "From List Order Shipping Addresses — the `id` of the destination being shipped to.",
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      placeholder: '[{ "order_product_id": 194, "quantity": 1 }]',
      hint: "`order_product_id` is the line `id` from List Order Products, NOT the catalog " +
        "product ID.",
    },
    { key: "trackingNumber", label: "Tracking number", type: "string" },
    {
      key: "shippingProvider",
      label: "Shipping provider",
      type: "string",
      hint: "Optional. Used to build the tracking link; accepted values are listed on the " +
        "vendor's Create Order Shipment reference.",
    },
    { key: "trackingCarrier", label: "Tracking carrier", type: "string", advanced: true },
    { key: "shippingMethod", label: "Shipping method", type: "string", advanced: true },
    { key: "comments", label: "Comments", type: "text", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "Shipment ID" },
    { key: "order_id", type: "number", label: "Order ID" },
  ],

  async execute(input, ctx) {
    const body = compact({
      order_address_id: input.orderAddressId,
      items: asJson<unknown>(input.items, "Items"),
      tracking_number: input.trackingNumber,
      shipping_provider: input.shippingProvider,
      tracking_carrier: input.trackingCarrier,
      shipping_method: input.shippingMethod,
      comments: input.comments,
    });
    return await new BigCommerceClient(ctx).v2(`/orders/${encodeId(input.orderId)}/shipments`, {
      method: "POST",
      body,
    });
  },
};

export default orderShipmentCreate;
