import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  search?: string;
  status?: string;
  customer?: number;
  product?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  after?: string;
  before?: string;
  perPage?: number;
  page?: number;
}

const orderGetMany: ActionDefinition<Input> = {
  key: "order-get-many",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders on a single page. Set `page` to walk further pages.",
  params: [
    { key: "search", label: "Search", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "pending", label: "Pending" },
        { value: "processing", label: "Processing" },
        { value: "on-hold", label: "On Hold" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "refunded", label: "Refunded" },
        { value: "failed", label: "Failed" },
        { value: "trash", label: "Trash" },
      ],
    },
    { key: "customer", label: "Customer ID", type: "number" },
    { key: "product", label: "Product ID", type: "number" },
    { key: "orderBy", label: "Order By", type: "string", default: "date" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "ASC" },
        { value: "desc", label: "DESC" },
      ],
      default: "desc",
    },
    { key: "after", label: "After (ISO8601)", type: "datetime" },
    { key: "before", label: "Before (ISO8601)", type: "datetime" },
    { key: "perPage", label: "Per Page", type: "number", default: 10 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "items", type: "array", label: "Orders" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request("/orders", {
      query: {
        search: input.search,
        status: input.status,
        customer: input.customer,
        product: input.product,
        orderby: input.orderBy,
        order: input.order,
        after: input.after,
        before: input.before,
        per_page: input.perPage ?? 10,
        page: input.page ?? 1,
      },
    });
  },
};

export default orderGetMany;
