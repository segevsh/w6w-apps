import type { ActionDefinition } from "@w6w/types";
import { page, SamCartClient } from "../lib/client.ts";

/** `GET /v1/products` */
interface Input {
  createdAtMin?: string;
  createdAtMax?: string;
  productStatus?: string;
  productCategory?: string;
  pricingType?: string;
  offset?: number;
  limit?: number;
  dir?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "read",
  resource: "product",
  title: "List Products",
  description: "Products, paginated, filterable by status, category and pricing type.",
  params: [
    {
      "key": "createdAtMin",
      "label": "Created at or after",
      "type": "string",
      "hint":
        "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16). A bare date means 00:00:00 UTC.",
    },
    {
      "key": "createdAtMax",
      "label": "Created at or before",
      "type": "string",
      "hint":
        "ISO 8601 date-time with timezone (2025-01-16T14:30:00Z) or a date (2025-01-16). A bare date means 23:59:59 UTC.",
    },
    {
      "key": "productStatus",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "live",
          "label": "live",
        },
        {
          "value": "test",
          "label": "test",
        },
        {
          "value": "archived",
          "label": "archived",
        },
      ],
    },
    {
      "key": "productCategory",
      "label": "Category",
      "type": "select",
      "options": [
        {
          "value": "physical",
          "label": "physical",
        },
        {
          "value": "digital",
          "label": "digital",
        },
      ],
    },
    {
      "key": "pricingType",
      "label": "Pricing type",
      "type": "select",
      "options": [
        {
          "value": "one_time",
          "label": "one_time",
        },
        {
          "value": "limited_subscription",
          "label": "limited_subscription",
        },
        {
          "value": "recurring_subscription",
          "label": "recurring_subscription",
        },
        {
          "value": "pwyw_one_time",
          "label": "pwyw_one_time",
        },
        {
          "value": "pwyw_recurring_subscription",
          "label": "pwyw_recurring_subscription",
        },
        {
          "value": "pwyw_limited_subscription",
          "label": "pwyw_limited_subscription",
        },
      ],
    },
    {
      "key": "offset",
      "label": "Offset",
      "type": "number",
      "hint": "`nextOffset` from the previous page. Leave empty for the first page.",
      "validation": {
        "integer": true,
        "min": 0,
      },
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 1-100. Defaults to 100.",
      "validation": {
        "integer": true,
        "min": 1,
        "max": 100,
      },
    },
    {
      "key": "dir",
      "label": "Direction",
      "type": "select",
      "options": [
        {
          "value": "next",
          "label": "Next",
        },
        {
          "value": "prev",
          "label": "Previous",
        },
      ],
      "hint": "`prev` pages backwards from the offset.",
    },
  ],
  output: [
    {
      "key": "data",
      "type": "array",
      "label": "The products on this page",
    },
    {
      "key": "next",
      "type": "string",
      "label": "URL of the next page; null on the last page",
    },
    {
      "key": "prev",
      "type": "string",
      "label": "URL of the previous page; null on the first page",
    },
    {
      "key": "nextOffset",
      "type": "string",
      "label": "Pass as Offset to fetch the next page; null on the last page",
    },
  ],

  async execute(input, ctx) {
    return page(
      await new SamCartClient(ctx).call("GET", `/products`, {
        query: {
          created_at_min: input.createdAtMin,
          created_at_max: input.createdAtMax,
          status: input.productStatus,
          product_category: input.productCategory,
          pricing_type: input.pricingType,
          offset: input.offset,
          limit: input.limit,
          dir: input.dir,
        },
      }),
    );
  },
};

export default productList;
