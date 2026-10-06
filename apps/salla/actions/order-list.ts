import type { ActionDefinition } from "@w6w/types";
import { perPage, SallaClient, toArray } from "../lib/client.ts";

interface Input {
  keyword?: string;
  status?: string | number | Array<string | number>;
  payment_method?: string | number | Array<string | number>;
  from_date?: string;
  to_date?: string;
  country?: number;
  city?: string;
  product?: string;
  branch?: string | number | Array<string | number>;
  tags?: string | number | Array<string | number>;
  reference_id?: number;
  coupon?: string;
  customer_id?: number;
  sort_by?: "id" | "total" | "updated_at" | "created_at";
  expanded?: boolean;
  page?: number;
  per_page?: number;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "List orders with Salla's documented filters. Needs the `orders.read` scope.",

  params: [
    {
      "key": "keyword",
      "label": "Keyword",
      "type": "string",
      "hint":
        "Free-text search, e.g. customer name or mobile, shipping number, reference ID or tag name.",
    },
    {
      "key": "status",
      "label": "Status IDs",
      "type": "string",
      "hint": "Comma-separated order status IDs (see order-status-list).",
    },
    {
      "key": "payment_method",
      "label": "Payment methods",
      "type": "string",
      "hint": "Comma-separated payment method slugs.",
    },
    {
      "key": "from_date",
      "label": "From date",
      "type": "string",
      "hint": "Orders created after this date.",
    },
    {
      "key": "to_date",
      "label": "To date",
      "type": "string",
      "hint": "Orders created before this date.",
    },
    {
      "key": "country",
      "label": "Country ID",
      "type": "number",
    },
    {
      "key": "city",
      "label": "City",
      "type": "string",
    },
    {
      "key": "product",
      "label": "Product name",
      "type": "string",
    },
    {
      "key": "branch",
      "label": "Branch IDs",
      "type": "string",
      "hint": "Comma-separated branch IDs.",
    },
    {
      "key": "tags",
      "label": "Tag IDs",
      "type": "string",
      "hint": "Comma-separated tag IDs.",
    },
    {
      "key": "reference_id",
      "label": "Reference ID",
      "type": "number",
    },
    {
      "key": "coupon",
      "label": "Coupon code",
      "type": "string",
    },
    {
      "key": "customer_id",
      "label": "Customer ID",
      "type": "number",
    },
    {
      "key": "sort_by",
      "label": "Sort by",
      "type": "select",
      "options": [
        {
          "value": "id",
          "label": "id",
        },
        {
          "value": "total",
          "label": "total",
        },
        {
          "value": "updated_at",
          "label": "updated_at",
        },
        {
          "value": "created_at",
          "label": "created_at",
        },
      ],
    },
    {
      "key": "expanded",
      "label": "Expanded",
      "type": "boolean",
      "hint": "Return full order details, same as Get Order.",
    },
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in `pagination` of the response.",
    },
    {
      "key": "per_page",
      "label": "Per page",
      "type": "number",
      "hint": "Records per page, 1 to 60 (Salla's documented maximum).",
    },
  ],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "array",
      "label": "Records on this page",
    },
    {
      "key": "pagination",
      "type": "object",
      "label": "count, total, perPage, currentPage, totalPages, links",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get("/orders", {
      keyword: input.keyword,
      status: toArray(input.status, "status"),
      payment_method: toArray(input.payment_method, "payment_method"),
      from_date: input.from_date,
      to_date: input.to_date,
      country: input.country,
      city: input.city,
      product: input.product,
      branch: toArray(input.branch, "branch"),
      tags: toArray(input.tags, "tags"),
      reference_id: input.reference_id,
      coupon: input.coupon,
      customer_id: input.customer_id,
      sort_by: input.sort_by,
      expanded: input.expanded,
      page: input.page,
      per_page: perPage(input.per_page),
    });
  },
};

export default orderList;
