import type { Param } from "@w6w/types";
import { DEFAULT_LIMIT, VENDOR_MAX_LIMIT } from "./client.ts";

/**
 * Shared `Param` fragments and option lists for the Ecwid actions.
 *
 * Every enum below is copied from the Ecwid page that documents the field, not
 * inferred: the status vocabularies from `search-orders.md` /
 * `create-order.md`, the sort orders from `search-products.md`, and the coupon
 * vocabularies from `create-discount-coupon.md` / `search-discount-coupons.md`.
 */

/**
 * The `limit`/`offset` pair every search endpoint accepts.
 *
 * **The default is deliberately not the vendor's.** Ecwid's `limit` docs say
 * "Maximum and default value (if not specified) is `100`" on every search page,
 * so prefilling 100 would make every workflow step that forgets to set a limit
 * return the vendor's maximum. The prefilled value is smaller and the ceiling
 * is still reachable explicitly.
 */
export function paginationParams(limitDefault = DEFAULT_LIMIT): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: limitDefault,
      validation: { integer: true, min: 1, max: VENDOR_MAX_LIMIT },
      hint:
        `Items per page. Ecwid's own default and maximum is ${VENDOR_MAX_LIMIT}; ${limitDefault} ` +
        "is prefilled so a step that forgets this does not silently fetch the maximum.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of items to skip from the start. Defaults to 0.",
    },
  ];
}

/**
 * `responseFields` — Ecwid's server-side projection, e.g.
 * `total,items(id,name,enabled)`. Worth using on the list actions: the default
 * responses carry image URLs, translations and SEO fields per item.
 */
export const responseFieldsParam: Param = {
  key: "responseFields",
  label: "Response fields",
  type: "string",
  advanced: true,
  placeholder: "total,items(id,name,enabled)",
  hint: "Return only these fields. Dotted notation works for nested fields, e.g. " +
    "`items(id,name,price)`. Every field this app's `output` declares stays available; " +
    "anything else is dropped from the response.",
};

/**
 * The free-form JSON escape hatch every write action declares.
 *
 * Ecwid's write bodies are large — `POST /products` documents 40+ properties,
 * `PUT /profile` a whole nested settings tree — so each action types the fields
 * a workflow sets most and lets the rest come through here.
 */
export const extraFieldsParam: Param = {
  key: "extraFields",
  label: "Additional fields",
  type: "json",
  advanced: true,
  hint: "Any other body field for this endpoint, as a JSON object. Merged over the fields above, " +
    "so a value given here wins. Field names are the ones on the vendor's API reference page " +
    "for this call.",
};

export const productIdParam: Param = {
  key: "productId",
  label: "Product",
  type: "string",
  required: true,
  placeholder: "692730761",
  hint: "Internal product ID — the `id` of a Search Products or Create Product result.",
};

export const categoryIdParam: Param = {
  key: "categoryId",
  label: "Category",
  type: "string",
  required: true,
  placeholder: "9691094",
  hint: "Internal category ID — the `id` of a Search Categories result.",
};

export const customerIdParam: Param = {
  key: "customerId",
  label: "Customer",
  type: "string",
  required: true,
  placeholder: "177737165",
  hint: "Internal customer ID — the `id` of a Search Customers result.",
};

/**
 * Order ids are strings, not numbers.
 *
 * `get-order.md` types `orderId` as a number yet adds "Can contain prefixes and
 * suffixes, for example: `EG4H2,J77J8`", and its own search example answers
 * `"id": "EBJFT"`. A numeric param would reject both, so this is a string.
 */
export const orderIdParam: Param = {
  key: "orderId",
  label: "Order",
  type: "string",
  required: true,
  placeholder: "EBJFT",
  hint: "Order ID — the `id` of a Search Orders result. May carry the store's own ID prefix " +
    "and/or suffix, so it is not always numeric.",
};

/** `sortBy` on `GET /products`, exactly as `search-products.md` enumerates it. */
export const productSortByOptions = [
  { value: "RELEVANCE", label: "Relevance (default)" },
  { value: "DEFINED_BY_STORE_OWNER", label: "Defined by store owner" },
  { value: "ADDED_TIME_DESC", label: "Newest first" },
  { value: "ADDED_TIME_ASC", label: "Oldest first" },
  { value: "NAME_ASC", label: "Name, A–Z" },
  { value: "NAME_DESC", label: "Name, Z–A" },
  { value: "PRICE_ASC", label: "Price, low to high" },
  { value: "PRICE_DESC", label: "Price, high to low" },
  { value: "UPDATED_TIME_ASC", label: "Least recently updated" },
  { value: "UPDATED_TIME_DESC", label: "Recently updated" },
  { value: "IN_STORE_RECEIVED_DATE_DESC", label: "Recently received in store" },
];

/** `sortBy` on `GET /customers`, exactly as `search-customers.md` enumerates it. */
export const customerSortByOptions = [
  { value: "NAME_ASC", label: "Name, A–Z" },
  { value: "NAME_DESC", label: "Name, Z–A" },
  { value: "EMAIL_ASC", label: "Email, A–Z" },
  { value: "EMAIL_DESC", label: "Email, Z–A" },
  { value: "ORDER_COUNT_ASC", label: "Fewest orders" },
  { value: "ORDER_COUNT_DESC", label: "Most orders" },
  { value: "REGISTERED_DATE_ASC", label: "Registered earliest" },
  { value: "REGISTERED_DATE_DESC", label: "Registered latest" },
  { value: "UPDATED_DATE_ASC", label: "Least recently updated" },
  { value: "UPDATED_DATE_DESC", label: "Recently updated" },
  { value: "SALES_VALUE_ASC", label: "Lowest total sales value" },
  { value: "SALES_VALUE_DESC", label: "Highest total sales value" },
  { value: "FIRST_ORDER_DATE_ASC", label: "First order, oldest" },
  { value: "FIRST_ORDER_DATE_DESC", label: "First order, newest" },
  { value: "LAST_ORDER_DATE_ASC", label: "Last order, oldest" },
  { value: "LAST_ORDER_DATE_DESC", label: "Last order, newest" },
];

/**
 * `fulfillmentStatus` — the same list on `search-orders` (where it accepts
 * several comma-separated values) and on `create-order`/`update-order` (where it
 * is required and single-valued).
 */
export const fulfillmentStatusOptions = [
  { value: "AWAITING_PROCESSING", label: "Awaiting processing" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "WILL_NOT_DELIVER", label: "Will not deliver" },
  { value: "RETURNED", label: "Returned" },
  { value: "READY_FOR_PICKUP", label: "Ready for pickup" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "CUSTOM_FULFILLMENT_STATUS_1", label: "Custom fulfillment status 1" },
  { value: "CUSTOM_FULFILLMENT_STATUS_2", label: "Custom fulfillment status 2" },
  { value: "CUSTOM_FULFILLMENT_STATUS_3", label: "Custom fulfillment status 3" },
];

/** `paymentStatus`, from the same two pages. */
export const paymentStatusOptions = [
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "INCOMPLETE", label: "Incomplete" },
  { value: "CUSTOM_PAYMENT_STATUS_1", label: "Custom payment status 1" },
  { value: "CUSTOM_PAYMENT_STATUS_2", label: "Custom payment status 2" },
  { value: "CUSTOM_PAYMENT_STATUS_3", label: "Custom payment status 3" },
];

/** `discountType` / the search filter `discount_type`. */
export const couponDiscountTypeOptions = [
  { value: "ABS", label: "Absolute amount off" },
  { value: "PERCENT", label: "Percentage off" },
  { value: "SHIPPING", label: "Free shipping" },
  { value: "ABS_AND_SHIPPING", label: "Absolute amount off and free shipping" },
  { value: "PERCENT_AND_SHIPPING", label: "Percentage off and free shipping" },
];

/** The coupon's `status`; the search filter is `availability` with the same values. */
export const couponStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "EXPIRED", label: "Expired" },
  { value: "USEDUP", label: "Used up" },
];

/** `usesLimit` on coupon create. */
export const couponUsesLimitOptions = [
  { value: "UNLIMITED", label: "Unlimited" },
  { value: "ONCEPERCUSTOMER", label: "Once per customer" },
  { value: "SINGLE", label: "Single use" },
];

/** `applicationLimit` on coupon create. */
export const couponApplicationLimitOptions = [
  { value: "UNLIMITED", label: "No limitation" },
  { value: "NEW_CUSTOMER_ONLY", label: "New customers only" },
  { value: "REPEAT_CUSTOMER_ONLY", label: "Returning customers only" },
];
