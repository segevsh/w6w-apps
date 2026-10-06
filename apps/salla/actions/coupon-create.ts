import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient } from "../lib/client.ts";

interface Input {
  code: string;
  type: "percentage" | "fixed";
  amount: number;
  free_shipping: boolean;
  exclude_sale_products: boolean;
  expiry_date: string;
  status?: string;
  start_date?: string;
  applied_in?: "all" | "web" | "app";
  usage_limit?: number;
  usage_limit_per_user?: number;
  minimum_amount?: number;
  maximum_amount?: number;
  additionalFields?: unknown;
}

const couponCreate: ActionDefinition<Input> = {
  key: "coupon-create",
  type: "perform",
  resource: "coupon",
  title: "Create Coupon",
  description:
    "Create a single coupon. Group and marketer coupons need their extra documented fields via Additional fields. Needs the `marketing.read_write` scope.",
  idempotent: false,
  params: [
    {
      "key": "code",
      "label": "Code",
      "type": "string",
      "required": true,
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "required": true,
      "hint": "Percentage or fixed amount (Salla also accepts P / F and capitalised forms).",
      "options": [
        {
          "value": "percentage",
          "label": "percentage",
        },
        {
          "value": "fixed",
          "label": "fixed",
        },
      ],
    },
    {
      "key": "amount",
      "label": "Amount",
      "type": "number",
      "required": true,
    },
    {
      "key": "free_shipping",
      "label": "Free shipping",
      "type": "boolean",
      "required": true,
      "default": false,
    },
    {
      "key": "exclude_sale_products",
      "label": "Exclude on-sale products",
      "type": "boolean",
      "required": true,
      "default": false,
    },
    {
      "key": "expiry_date",
      "label": "Expiry date",
      "type": "string",
      "required": true,
      "hint": "YYYY-MM-DD or YYYY-MM-DD HH:MM. Must be at least one day after today when creating.",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "string",
      "hint": "Coupon status, e.g. active or inactive.",
    },
    {
      "key": "start_date",
      "label": "Start date",
      "type": "string",
      "hint": "YYYY-MM-DD or YYYY-MM-DD HH:MM.",
    },
    {
      "key": "applied_in",
      "label": "Applied in",
      "type": "select",
      "options": [
        {
          "value": "all",
          "label": "all",
        },
        {
          "value": "web",
          "label": "web",
        },
        {
          "value": "app",
          "label": "app",
        },
      ],
    },
    {
      "key": "usage_limit",
      "label": "Usage limit",
      "type": "number",
    },
    {
      "key": "usage_limit_per_user",
      "label": "Usage limit per customer",
      "type": "number",
    },
    {
      "key": "minimum_amount",
      "label": "Minimum order amount",
      "type": "number",
    },
    {
      "key": "maximum_amount",
      "label": "Maximum discount amount",
      "type": "number",
      "hint": "Required by Salla when the type is percentage.",
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        "JSON object of any further documented Salla body fields. Fields set above take precedence.",
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
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.post(
      "/coupons",
      buildBody({
        code: input.code,
        type: input.type,
        amount: input.amount,
        free_shipping: input.free_shipping,
        exclude_sale_products: input.exclude_sale_products,
        expiry_date: input.expiry_date,
        status: input.status,
        start_date: input.start_date,
        applied_in: input.applied_in,
        usage_limit: input.usage_limit,
        usage_limit_per_user: input.usage_limit_per_user,
        minimum_amount: input.minimum_amount,
        maximum_amount: input.maximum_amount,
      }, input.additionalFields),
    );
  },
};

export default couponCreate;
