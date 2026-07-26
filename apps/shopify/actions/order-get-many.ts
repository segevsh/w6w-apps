import type { ActionDefinition } from "@w6w/types";
import { type Paged, ShopifyClient, unset } from "../lib/client.ts";
import { pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  status?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  createdAtMin?: string;
  limit?: number;
  pageInfo?: string;
}

const orderGetMany: ActionDefinition<Input, Paged<unknown>> = {
  key: "order-get-many",
  type: "search",
  resource: "order",
  title: "List Orders",
  description:
    "List orders. Shopify defaults to open orders only — set Status to `any` to include closed ones.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "open",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "any", label: "Any" },
      ],
    },
    {
      key: "financialStatus",
      label: "Financial status",
      type: "select",
      row: "state",
      options: [
        { value: "pending", label: "Pending" },
        { value: "authorized", label: "Authorized" },
        { value: "paid", label: "Paid" },
        { value: "partially_refunded", label: "Partially refunded" },
        { value: "refunded", label: "Refunded" },
        { value: "voided", label: "Voided" },
      ],
    },
    {
      key: "fulfillmentStatus",
      label: "Fulfillment status",
      type: "select",
      row: "state",
      options: [
        { value: "shipped", label: "Shipped" },
        { value: "partial", label: "Partial" },
        { value: "unshipped", label: "Unshipped" },
        { value: "any", label: "Any" },
      ],
    },
    { key: "createdAtMin", label: "Created since", type: "datetime", hint: "ISO 8601 timestamp." },
    ...pagination,
  ],
  output: pagedOutput,

  execute(input, ctx) {
    const cursor = unset(input.pageInfo);
    return new ShopifyClient(ctx).list<unknown>("/orders.json", "orders", {
      limit: input.limit,
      page_info: cursor,
      status: cursor ? undefined : unset(input.status),
      financial_status: cursor ? undefined : unset(input.financialStatus),
      fulfillment_status: cursor ? undefined : unset(input.fulfillmentStatus),
      created_at_min: cursor ? undefined : unset(input.createdAtMin),
    });
  },
};

export default orderGetMany;
