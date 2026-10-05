import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `GET /v1/products/{productId}` */
interface Input {
  productId: number;
  createdAtMin?: string;
  createdAtMax?: string;
  productStatus?: string;
  productCategory?: string;
  pricingType?: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "One product with its price, taxes, order bumps and bundled products.",
  params: [
    {
      "key": "productId",
      "label": "Product ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
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
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "Product id",
    },
  ],

  async execute(input, ctx) {
    return await new SamCartClient(ctx).call(
      "GET",
      `/products/${intId(input.productId, "Product ID")}`,
      {
        query: {
          created_at_min: input.createdAtMin,
          created_at_max: input.createdAtMax,
          status: input.productStatus,
          product_category: input.productCategory,
          pricing_type: input.pricingType,
        },
      },
    );
  },
};

export default productGet;
