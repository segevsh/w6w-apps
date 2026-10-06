import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, encodeId, toObject } from "../lib/client.ts";

/**
 * `PATCH /api/v2/products/{productId}` — Update a product; only the fields you send change.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  productId: number;
  name: string;
  price?: number;
  tax_rate?: number;
  description?: string;
  internal_id?: string;
  product_code?: string;
  supplier_product_code?: string;
  job_costing?: number;
  tax_deee?: number;
  eco_participation?: number;
  location?: string;
  unit?: string;
  product_type?: number;
  category?: string;
  custom_fields?: string | Record<string, unknown> | unknown[];
  stock_threshold?: number;
  disabled?: boolean;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Update a product; only the fields you send change.",
  idempotent: true,
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the product.",
    },
    { key: "name", label: "Name", type: "string", required: true, hint: "Product name." },
    { key: "price", label: "Price", type: "number", hint: "Unit price excluding tax." },
    { key: "tax_rate", label: "Tax rate", type: "number", hint: "Tax rate in percent." },
    { key: "description", label: "Description", type: "text", hint: "Description." },
    { key: "internal_id", label: "Internal ID", type: "string", hint: "Your own id." },
    { key: "product_code", label: "Product code", type: "string", hint: "Code." },
    {
      key: "supplier_product_code",
      label: "Supplier code",
      type: "string",
      hint: "Supplier code.",
    },
    { key: "job_costing", label: "Job costing", type: "number", hint: "Unit cost." },
    { key: "tax_deee", label: "DEEE tax", type: "number", hint: "DEEE tax." },
    {
      key: "eco_participation",
      label: "Eco participation",
      type: "number",
      hint: "Eco participation.",
    },
    { key: "location", label: "Location", type: "string", hint: "Storage location." },
    { key: "unit", label: "Unit", type: "string", hint: "Unit label." },
    {
      key: "product_type",
      label: "Product type",
      type: "number",
      hint: "Numeric product type code.",
    },
    { key: "category", label: "Category", type: "string", hint: "Category name." },
    {
      key: "custom_fields",
      label: "Custom fields",
      type: "json",
      hint: 'JSON object `{"customFieldName": value}`.',
    },
    { key: "stock_threshold", label: "Stock threshold", type: "number", hint: "Alert threshold." },
    {
      key: "disabled",
      label: "Disabled",
      type: "boolean",
      hint: "Disable or re-enable the product.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "product_code", type: "string", label: "Product code" },
    { key: "price", type: "number", label: "Unit price" },
    { key: "tax_rate", type: "number", label: "Tax rate" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/products/${encodeId(input.productId)}`, {
      method: "PATCH",
      body: compact({
        "name": input.name,
        "price": input.price,
        "tax_rate": input.tax_rate,
        "description": input.description,
        "internal_id": input.internal_id,
        "product_code": input.product_code,
        "supplier_product_code": input.supplier_product_code,
        "job_costing": input.job_costing,
        "tax_deee": input.tax_deee,
        "eco_participation": input.eco_participation,
        "location": input.location,
        "unit": input.unit,
        "product_type": input.product_type,
        "category": input.category,
        "custom_fields": toObject(input.custom_fields, "custom_fields"),
        "stock_threshold": input.stock_threshold,
        "disabled": input.disabled,
      }),
    });
  },
};

export default productUpdate;
