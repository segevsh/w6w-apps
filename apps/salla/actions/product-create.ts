import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient, toArray } from "../lib/client.ts";

interface Input {
  name: string;
  price: number;
  product_type:
    | "product"
    | "service"
    | "group_products"
    | "codes"
    | "digital"
    | "food"
    | "booking"
    | "donating";
  status?: "sale" | "out" | "hidden" | "deleted";
  description?: string;
  quantity?: number;
  unlimited_quantity?: boolean;
  sale_price?: number;
  cost_price?: number;
  sku?: string;
  weight?: number;
  weight_type?: "kg" | "g" | "lb" | "oz";
  require_shipping?: boolean;
  with_tax?: boolean;
  brand_id?: number;
  categories?: string | number | Array<string | number>;
  additionalFields?: unknown;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description:
    "Create a product. Product types other than `product` need further documented fields via Additional fields. Needs the `products.read_write` scope.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "price",
      "label": "Price",
      "type": "number",
      "required": true,
    },
    {
      "key": "product_type",
      "label": "Product type",
      "type": "select",
      "required": true,
      "default": "product",
      "options": [
        {
          "value": "product",
          "label": "product",
        },
        {
          "value": "service",
          "label": "service",
        },
        {
          "value": "group_products",
          "label": "group_products",
        },
        {
          "value": "codes",
          "label": "codes",
        },
        {
          "value": "digital",
          "label": "digital",
        },
        {
          "value": "food",
          "label": "food",
        },
        {
          "value": "booking",
          "label": "booking",
        },
        {
          "value": "donating",
          "label": "donating",
        },
      ],
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "sale",
          "label": "sale",
        },
        {
          "value": "out",
          "label": "out",
        },
        {
          "value": "hidden",
          "label": "hidden",
        },
        {
          "value": "deleted",
          "label": "deleted",
        },
      ],
    },
    {
      "key": "description",
      "label": "Description",
      "type": "text",
    },
    {
      "key": "quantity",
      "label": "Quantity",
      "type": "number",
      "hint": "Ignored by Salla when unlimited quantity is on.",
    },
    {
      "key": "unlimited_quantity",
      "label": "Unlimited quantity",
      "type": "boolean",
    },
    {
      "key": "sale_price",
      "label": "Sale price",
      "type": "number",
    },
    {
      "key": "cost_price",
      "label": "Cost price",
      "type": "number",
    },
    {
      "key": "sku",
      "label": "SKU",
      "type": "string",
    },
    {
      "key": "weight",
      "label": "Weight",
      "type": "number",
    },
    {
      "key": "weight_type",
      "label": "Weight unit",
      "type": "select",
      "options": [
        {
          "value": "kg",
          "label": "kg",
        },
        {
          "value": "g",
          "label": "g",
        },
        {
          "value": "lb",
          "label": "lb",
        },
        {
          "value": "oz",
          "label": "oz",
        },
      ],
    },
    {
      "key": "require_shipping",
      "label": "Requires shipping",
      "type": "boolean",
    },
    {
      "key": "with_tax",
      "label": "Price includes tax",
      "type": "boolean",
    },
    {
      "key": "brand_id",
      "label": "Brand ID",
      "type": "number",
    },
    {
      "key": "categories",
      "label": "Category IDs",
      "type": "string",
      "hint": "Comma-separated or JSON array of category IDs.",
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
      "/products",
      buildBody({
        name: input.name,
        price: input.price,
        product_type: input.product_type,
        status: input.status,
        description: input.description,
        quantity: input.quantity,
        unlimited_quantity: input.unlimited_quantity,
        sale_price: input.sale_price,
        cost_price: input.cost_price,
        sku: input.sku,
        weight: input.weight,
        weight_type: input.weight_type,
        require_shipping: input.require_shipping,
        with_tax: input.with_tax,
        brand_id: input.brand_id,
        categories: toArray(input.categories, "categories"),
      }, input.additionalFields),
    );
  },
};

export default productCreate;
