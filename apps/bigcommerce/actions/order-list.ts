import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, toList } from "../lib/client.ts";
import { orderIncludeOptions, orderSortOptions } from "../lib/params.ts";

/**
 * `GET /v2/orders` — the store's orders.
 *
 * ## Why v2, and why that is not a mistake
 *
 * There is no v3 orders CRUD. BigCommerce's "Orders V3" reference
 * (`admin-management-order-operations`) contains transactions, refunds,
 * metafields and settings and nothing else — the vendor's own Orders overview
 * says so in its first paragraph, and the create/read/update examples in that
 * same guide all use `/v2/orders`. `/v2/orders` is also absent from the
 * Deprecations and Sunsets page, which *does* list `/v2/products`,
 * `/v2/customers`, `/v2/categories` and `/v2/brands`. So this endpoint is the
 * current one; the v2 in its path says nothing about its age.
 *
 * ## The v2 shape, and what it costs you
 *
 * v2 answers a **bare JSON array** — no `{data, meta}` envelope — and carries
 * **no pagination metadata at all**. There is no `total` and no `total_pages`
 * here, which is exactly why `GET /v2/orders/count` exists as a separate
 * endpoint and why this app ships it as `order-count`. Page until a page comes
 * back shorter than the limit.
 *
 * The `sort` values are bare field names (`date_created`) with no direction
 * token, unlike `/v3/customers`, whose sort values embed one (`date_created:desc`).
 */
interface Input {
  minId?: number;
  maxId?: number;
  customerId?: number;
  email?: string;
  statusId?: number;
  channelId?: number;
  cartId?: string;
  paymentMethod?: string;
  minDateCreated?: string;
  maxDateCreated?: string;
  minDateModified?: string;
  include?: string[];
  sort?: string;
  limit?: number;
  page?: number;
}

const orderList: ActionDefinition<Input, { orders: unknown[] }> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description:
    "Search orders. This is the current Orders API — order CRUD exists only at v2; v3 covers " +
    "transactions and refunds.",
  params: [
    { key: "customerId", label: "Customer ID", type: "number", validation: { integer: true } },
    { key: "email", label: "Customer email", type: "string" },
    {
      key: "statusId",
      label: "Status ID",
      type: "number",
      validation: { integer: true },
      hint: "Numeric. Use List Order Statuses to see the store's own IDs — custom labels are " +
        "allowed, so do not hard-code a name.",
    },
    { key: "channelId", label: "Channel ID", type: "number", validation: { integer: true } },
    {
      key: "minDateCreated",
      label: "Created after",
      type: "string",
      placeholder: "Thu, 01 Aug 2026 00:00:00 +0000",
      hint: "v2 date filters take an RFC-2822 date string.",
    },
    { key: "maxDateCreated", label: "Created before", type: "string", advanced: true },
    { key: "minDateModified", label: "Modified after", type: "string", advanced: true },
    { key: "minId", label: "Minimum order ID", type: "number", advanced: true },
    { key: "maxId", label: "Maximum order ID", type: "number", advanced: true },
    { key: "cartId", label: "Cart ID", type: "string", advanced: true },
    { key: "paymentMethod", label: "Payment method", type: "string", advanced: true },
    {
      key: "include",
      label: "Include sub-resources",
      type: "multiselect",
      options: orderIncludeOptions,
    },
    { key: "sort", label: "Sort by", type: "select", options: orderSortOptions },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 250 },
      hint: "The vendor's own default is 50 and its maximum is 250. v2 returns NO page count, so " +
        "page until a page comes back short — or call Count Orders first.",
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
  ],
  output: [{ key: "orders", type: "array", label: "Orders (a bare array — v2 has no envelope)" }],

  async execute(input, ctx) {
    const orders = await new BigCommerceClient(ctx).v2List("/orders", {
      query: {
        min_id: input.minId,
        max_id: input.maxId,
        customer_id: input.customerId,
        email: input.email,
        status_id: input.statusId,
        channel_id: input.channelId,
        cart_id: input.cartId,
        payment_method: input.paymentMethod,
        min_date_created: input.minDateCreated,
        max_date_created: input.maxDateCreated,
        min_date_modified: input.minDateModified,
        include: toList(input.include),
        sort: input.sort,
        limit: input.limit,
        page: input.page,
      },
    });
    return { orders };
  },
};

export default orderList;
