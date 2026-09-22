import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, type EcwidListPage } from "../lib/client.ts";
import { paginationParams, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /orders` — search orders.
 *
 * Two documented details shape this action:
 *
 *  - There is **no `status` filter** (and no `orderNumber` one) on this endpoint,
 *    whatever other clients suggest. Order state is filtered through
 *    `fulfillmentStatus` (shipping) and `paymentStatus` (money), both of which
 *    accept several comma-separated values in one query param, so they are
 *    declared as strings rather than single-choice selects.
 *  - Dates accept either a UNIX timestamp or `2023-01-15 19:27:50`, which is why
 *    these are strings and not `date` params.
 */
interface Input {
  email?: string;
  keywords?: string;
  customerId?: number;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  couponCode?: string;
  limit?: number;
  offset?: number;
  responseFields?: string;
}

const orderSearch: ActionDefinition<Input> = {
  key: "order-search",
  type: "search",
  resource: "order",
  title: "Search Orders",
  description: "Search orders by customer, status, coupon or date range.",
  params: [
    {
      key: "email",
      label: "Customer email",
      type: "string",
      hint: "Exact search term for the customer's email.",
    },
    {
      key: "keywords",
      label: "Keywords",
      type: "string",
      hint: "Free-text search across order ID, external transaction ID, billing and shipping " +
        "addresses, customer email, shipping tracking code and item SKUs.",
    },
    {
      key: "customerId",
      label: "Customer ID",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Internal customer ID — the `id` from a customer search result.",
    },
    {
      key: "fulfillmentStatus",
      label: "Fulfillment status",
      type: "string",
      placeholder: "SHIPPED,DELIVERED",
      hint: "One or more of `AWAITING_PROCESSING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, " +
        "`WILL_NOT_DELIVER`, `RETURNED`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, " +
        "`CUSTOM_FULFILLMENT_STATUS_1..3` — comma-separated, since the API accepts several in " +
        "one param.",
    },
    {
      key: "paymentStatus",
      label: "Payment status",
      type: "string",
      placeholder: "PAID",
      hint: "One or more of `AWAITING_PAYMENT`, `PAID`, `CANCELLED`, `REFUNDED`, " +
        "`PARTIALLY_REFUNDED`, `INCOMPLETE`, `CUSTOM_PAYMENT_STATUS_1..3` — comma-separated.",
    },
    {
      key: "createdFrom",
      label: "Placed from",
      type: "string",
      placeholder: "2026-01-15 00:00:00",
      hint: "Lower bound on the order's placement time. UNIX timestamp or `YYYY-MM-DD HH:mm:ss`.",
    },
    {
      key: "createdTo",
      label: "Placed until",
      type: "string",
      placeholder: "2026-01-31 23:59:59",
      hint: "Upper bound on the order's placement time, same two formats.",
    },
    {
      key: "updatedFrom",
      label: "Updated from",
      type: "string",
      advanced: true,
      hint: "Lower bound on the order's last update, same two formats.",
    },
    {
      key: "updatedTo",
      label: "Updated until",
      type: "string",
      advanced: true,
      hint: "Upper bound on the order's last update, same two formats.",
    },
    {
      key: "couponCode",
      label: "Coupon code",
      type: "string",
      advanced: true,
      hint: "Finds orders the discount coupon with this code was applied to.",
    },
    ...paginationParams(),
    responseFieldsParam,
  ],
  output: [
    { key: "items", type: "array", label: "Orders" },
    { key: "total", type: "number", label: "Total matching orders" },
    { key: "count", type: "number", label: "Orders in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size Ecwid used" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json<EcwidListPage<unknown>>("/orders", {
      query: {
        email: input.email,
        keywords: input.keywords,
        customerId: input.customerId,
        fulfillmentStatus: input.fulfillmentStatus,
        paymentStatus: input.paymentStatus,
        createdFrom: input.createdFrom,
        createdTo: input.createdTo,
        updatedFrom: input.updatedFrom,
        updatedTo: input.updatedTo,
        couponCode: input.couponCode,
        limit: input.limit,
        offset: input.offset,
        responseFields: input.responseFields,
      },
    });
  },
};

export default orderSearch;
