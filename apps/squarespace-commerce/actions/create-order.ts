import type { ActionDefinition } from "@w6w/types";
import { API_V1, compact, jsonParam, requireJson, SquarespaceClient } from "../lib/client.ts";
import { options, orderOutput } from "../lib/params.ts";

/**
 * `POST /1.0/commerce/orders` — create an order.
 *
 * ## The seven fields Squarespace marks required
 *
 * `channelName`, `createdOn`, `externalOrderReference`, `fulfillments`,
 * `grandTotal`, `lineItems` and `priceTaxInterpretation` — read straight off the
 * operation's own `required` array on the live page, and required here for the
 * same reason: the vendor answers `400 INVALID_REQUEST_ERROR/MISSING_ARGUMENT`
 * without them.
 *
 * ## This is the endpoint with its own, much tighter rate limit
 *
 * With an API key (which is the only auth this app supports) it is
 * **100 requests per hour per website**, against the general 300/minute. A
 * workflow that creates orders in a loop will hit it. See the README.
 *
 * ## `Idempotency-Key` is required, and its absence is silent
 *
 * Without the header the vendor's documented behaviour is a replay that
 * "short-circuits to the previous operation was successful, no new changes" — a
 * `204` with no error, not a rejection. The client stamps one from the
 * invocation id per call (`SquarespaceClient`, `{ idempotent: true }`), so a
 * retried step replays instead of creating a second order, and two different
 * invocations never share a key.
 *
 * ## Two shape traps
 *
 *  - **`fulfillments` is required even when there is nothing to ship** — send
 *    `[]` for an unfulfilled order, not nothing.
 *  - **`lineItems` "cannot be empty"**, and its only required members are
 *    `lineItemType`, `quantity` and `unitPricePaid` (plus `title` and
 *    `unitPricePaid` as the create-page table lists them). It is modelled as
 *    JSON so the vendor's own documented subset can be passed through rather
 *    than frozen here.
 */
const ORDER_FULFILLMENT_STATUSES = ["PENDING", "FULFILLED"] as const;
const INVENTORY_BEHAVIORS = ["DEDUCT", "SKIP"] as const;
const NOTIFICATION_BEHAVIORS = ["SEND", "SKIP"] as const;
const PRICE_TAX_INTERPRETATIONS = ["INCLUSIVE", "EXCLUSIVE"] as const;

interface Input {
  channelName: string;
  createdOn: string;
  externalOrderReference: string;
  fulfillments: unknown;
  grandTotal: unknown;
  lineItems: unknown;
  priceTaxInterpretation: string;
  billingAddress?: unknown;
  shippingAddress?: unknown;
  customerEmail?: string;
  discountLines?: unknown;
  discountTotal?: unknown;
  fulfilledOn?: string;
  fulfillmentStatus?: string;
  inventoryBehavior?: string;
  shippingLines?: unknown;
  shippingTotal?: unknown;
  shopperFulfillmentNotificationBehavior?: string;
  subtotal?: unknown;
  taxTotal?: unknown;
}

const createOrder: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-order",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description:
    "Create an order from an external sales channel. Squarespace requires `channelName`, " +
    "`createdOn`, `externalOrderReference`, `fulfillments`, `grandTotal`, `lineItems` and " +
    "`priceTaxInterpretation`; an `Idempotency-Key` is stamped for you.",
  idempotent: true,
  params: [
    {
      key: "channelName",
      label: "Channel name",
      type: "string",
      required: true,
      validation: { maxLength: 30 },
      placeholder: "Faire Wholesale",
      hint: "Name of the third-party sales channel this order came from. Maximum 30 characters.",
    },
    {
      key: "createdOn",
      label: "Created on",
      type: "string",
      required: true,
      placeholder: "2026-09-22T15:58:07.187Z",
      hint: "ISO 8601 UTC date-time the order was placed. Squarespace stores what you send.",
    },
    {
      key: "externalOrderReference",
      label: "External order reference",
      type: "string",
      required: true,
      validation: { maxLength: 200 },
      placeholder: "EXT-98765",
      hint: "The order's id in your own system. Maximum 200 characters. This is the only field " +
        "that ties a Squarespace order back to the source record.",
    },
    {
      key: "grandTotal",
      label: "Grand total",
      type: "json",
      required: true,
      placeholder: '{"currency":"USD","value":49.99}',
      hint: "The order's final total. The vendor's schema types `currency` as a Currency object " +
        "while its own example body sends the plain ISO code — pass the documented example " +
        'shape, `{"currency":"USD","value":49.99}`.',
    },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      required: true,
      placeholder: '[{"lineItemType":"PHYSICAL_PRODUCT","title":"Brine 32oz",' +
        '"quantity":2,"unitPricePaid":{"currency":"USD","value":24.99},' +
        '"variantId":"…"}]',
      hint: "Non-empty array of purchased items. Required members per item: `lineItemType`, " +
        "`quantity`, `title` and `unitPricePaid`; `variantId` and `nonSaleUnitPrice` are " +
        "optional. Adding a `variantId` is what lets Squarespace attribute stock and reports.",
    },
    {
      key: "fulfillments",
      label: "Fulfillments",
      type: "json",
      required: true,
      placeholder: "[]",
      hint: "Array of shipping fulfillments (up to 100), each with `carrierName`, `service`, " +
        "`shipDate`, `trackingNumber` and `trackingUrl`. Required even when empty — send `[]` " +
        "for an order that has not shipped.",
    },
    {
      key: "priceTaxInterpretation",
      label: "Price tax interpretation",
      type: "select",
      required: true,
      options: options(PRICE_TAX_INTERPRETATIONS),
      hint: "Whether `lineItems.unitPricePaid` includes tax.",
    },
    {
      key: "fulfillmentStatus",
      label: "Fulfillment status",
      type: "select",
      options: options(ORDER_FULFILLMENT_STATUSES),
      advanced: true,
      hint: "`PENDING` by default. If you set `FULFILLED`, `fulfilledOn` is required too.",
    },
    {
      key: "fulfilledOn",
      label: "Fulfilled on",
      type: "string",
      advanced: true,
      placeholder: "2026-09-22T16:00:00Z",
      hint: "ISO 8601 UTC date-time. Required when fulfillment status is `FULFILLED`.",
    },
    {
      key: "customerEmail",
      label: "Customer email",
      type: "string",
      advanced: true,
      hint: "Matched against existing profiles to attach the order to a customer. What the " +
        "vendor stores if none matches is a guest order.",
    },
    {
      key: "inventoryBehavior",
      label: "Inventory behavior",
      type: "select",
      options: options(INVENTORY_BEHAVIORS),
      advanced: true,
      hint: "`DEDUCT` subtracts stock for every `lineItems[].variantId` when the order is " +
        "created; `SKIP` (the default) leaves inventory untouched. A variant with stock " +
        "tracking that cannot cover the quantity fails the create.",
    },
    {
      key: "shopperFulfillmentNotificationBehavior",
      label: "Shopper fulfillment notification",
      type: "select",
      options: options(NOTIFICATION_BEHAVIORS),
      advanced: true,
      hint: "`SEND` emails the customer a fulfillment notification; `SKIP` sends nothing.",
    },
    { key: "subtotal", label: "Subtotal", type: "json", advanced: true },
    { key: "taxTotal", label: "Tax total", type: "json", advanced: true },
    { key: "shippingTotal", label: "Shipping total", type: "json", advanced: true },
    { key: "discountTotal", label: "Discount total", type: "json", advanced: true },
    {
      key: "discountLines",
      label: "Discount lines",
      type: "json",
      advanced: true,
      hint: "Array of `{amount, description, name, promoCode}` entries describing promotions.",
    },
    {
      key: "shippingLines",
      label: "Shipping lines",
      type: "json",
      advanced: true,
      hint: "Array describing the shipping charges applied to the order.",
    },
    {
      key: "billingAddress",
      label: "Billing address",
      type: "json",
      advanced: true,
      hint: "`{address1, address2, city, countryCode, firstName, lastName, phone, postalCode, " +
        "state}`.",
    },
    {
      key: "shippingAddress",
      label: "Shipping address",
      type: "json",
      advanced: true,
      hint: "Same shape as the billing address.",
    },
  ],
  output: orderOutput,

  execute(input, ctx) {
    const lineItems = requireJson<unknown>(input.lineItems, "lineItems");
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new Error(
        "lineItems must be a non-empty array — Squarespace rejects an order with no items",
      );
    }
    if (input.fulfillmentStatus === "FULFILLED" && !input.fulfilledOn?.trim()) {
      throw new Error(
        "fulfilledOn is required when fulfillmentStatus is FULFILLED — say when it shipped",
      );
    }

    const body = compact({
      channelName: input.channelName,
      createdOn: input.createdOn,
      externalOrderReference: input.externalOrderReference,
      fulfillments: requireJson<unknown>(input.fulfillments, "fulfillments"),
      grandTotal: requireJson<unknown>(input.grandTotal, "grandTotal"),
      lineItems,
      priceTaxInterpretation: input.priceTaxInterpretation,
      billingAddress: jsonParam(input.billingAddress, "billingAddress"),
      shippingAddress: jsonParam(input.shippingAddress, "shippingAddress"),
      customerEmail: input.customerEmail,
      discountLines: jsonParam(input.discountLines, "discountLines"),
      discountTotal: jsonParam(input.discountTotal, "discountTotal"),
      fulfilledOn: input.fulfilledOn,
      fulfillmentStatus: input.fulfillmentStatus,
      inventoryBehavior: input.inventoryBehavior,
      shippingLines: jsonParam(input.shippingLines, "shippingLines"),
      shippingTotal: jsonParam(input.shippingTotal, "shippingTotal"),
      shopperFulfillmentNotificationBehavior: input.shopperFulfillmentNotificationBehavior,
      subtotal: jsonParam(input.subtotal, "subtotal"),
      taxTotal: jsonParam(input.taxTotal, "taxTotal"),
    });

    return new SquarespaceClient(ctx).post<Record<string, unknown>>(
      `${API_V1}/commerce/orders`,
      body,
      { idempotent: true },
    );
  },
};

export default createOrder;
