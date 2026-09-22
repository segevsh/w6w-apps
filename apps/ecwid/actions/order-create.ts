import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, mergeBody } from "../lib/client.ts";
import { extraFieldsParam, fulfillmentStatusOptions, paymentStatusOptions } from "../lib/params.ts";

/**
 * `POST /orders` — create an order.
 *
 * **Five fields are required**, and the vendor marks each of them: `email`,
 * `subtotal`, `total`, `fulfillmentStatus` and `paymentStatus`. They are
 * required here for the same reason — Ecwid answers `400 WRONG_PARAMETER`
 * without them.
 *
 * Two consequences of creating an order through the API that the docs state and
 * a workflow should not discover the hard way:
 *
 *  - `subtotal` and `total` are **yours to compute**: `subtotal` is the sum of
 *    `price × quantity` across the items before any modifier, and `total` is the
 *    final cost with shipping, taxes and discounts applied. Ecwid stores what it
 *    is told; it does not recalculate them.
 *  - `fulfillmentStatus` and `paymentStatus` are required because an order
 *    created by an app has no checkout to set them. `AWAITING_PROCESSING` and
 *    `AWAITING_PAYMENT` are the states a not-yet-fulfilled order starts in.
 *
 * Answers `{"id": <new order id>}`. That id is the public order id (a string,
 * not necessarily numeric), not the internal one.
 *
 * Not idempotent: no idempotency key exists, so a retried create makes a second
 * order — and orders are business records.
 */
interface Input {
  email: string;
  subtotal: number;
  total: number;
  fulfillmentStatus: string;
  paymentStatus: string;
  items?: unknown;
  billingPerson?: unknown;
  shippingPerson?: unknown;
  orderComments?: string;
  extraFields?: unknown;
}

const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description:
    "Create an order. Email, subtotal, total and both statuses are required by the API; Ecwid " +
    "stores the totals you send rather than recalculating them.",
  idempotent: false,
  params: [
    { key: "email", label: "Customer email", type: "string", required: true },
    {
      key: "subtotal",
      label: "Subtotal",
      type: "number",
      required: true,
      validation: { min: 0 },
      hint: "Sum of each item's `price × quantity`, before taxes, shipping, fees and discounts.",
    },
    {
      key: "total",
      label: "Total",
      type: "number",
      required: true,
      validation: { min: 0 },
      hint: "Final order cost with every modifier applied. Not recalculated after the order is " +
        "placed.",
    },
    {
      key: "fulfillmentStatus",
      label: "Fulfillment status",
      type: "select",
      required: true,
      options: fulfillmentStatusOptions,
      default: "AWAITING_PROCESSING",
    },
    {
      key: "paymentStatus",
      label: "Payment status",
      type: "select",
      required: true,
      options: paymentStatusOptions,
      default: "AWAITING_PAYMENT",
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      hint: 'Array of order items, e.g. `[{"productId":692730761,"name":"Widget",' +
        '"price":10,"quantity":2}]`. Each item also accepts `sku`, `weight`, `tax`, ' +
        "`selectedOptions` and the other fields listed under `items` on the Create Order page.",
    },
    {
      key: "billingPerson",
      label: "Billing person",
      type: "json",
      hint: '`{"name","companyName","street","city","countryCode","postalCode",…}`.',
    },
    {
      key: "shippingPerson",
      label: "Shipping person",
      type: "json",
      hint: "Same shape as the billing person.",
    },
    {
      key: "orderComments",
      label: "Customer comment",
      type: "string",
      advanced: true,
    },
    extraFieldsParam,
  ],
  output: [{ key: "id", type: "string", label: "ID of the created order" }],

  execute(input, ctx) {
    const body = mergeBody({
      email: input.email,
      subtotal: input.subtotal,
      total: input.total,
      fulfillmentStatus: input.fulfillmentStatus,
      paymentStatus: input.paymentStatus,
      items: input.items,
      billingPerson: input.billingPerson,
      shippingPerson: input.shippingPerson,
      orderComments: input.orderComments,
    }, input.extraFields);
    return new EcwidClient(ctx).json("/orders", { method: "POST", body });
  },
};

export default orderCreate;
