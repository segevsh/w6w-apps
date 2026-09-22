import type { ActionDefinition } from "@w6w/types";
import { API_V2, changeBody, jsonParam, SquarespaceClient } from "../lib/client.ts";
import { variantOutput } from "../lib/params.ts";

/**
 * `POST /v2/commerce/products/{productId}/variants/{variantId}` — update a
 * variant.
 *
 * Another `POST`-as-update, and another Change-wrapper body: the writable
 * members are `sku`, `pricing`, `attributes`, `gtin`, `mpn`,
 * `shippingMeasurements` and `stock`, each wrapped `{present, value}` by
 * `changeBody()` from the plain params below. A field left empty is unchanged; a
 * field set is sent as its value.
 *
 * As on `update-product`, `pricing`'s own value nests a second level of Change
 * members (`basePrice`, `onSale`, `salePrice`) in the vendor's schema — the hint
 * carries the documented shape. Supplying no field at all is rejected.
 */
interface Input {
  productId: string;
  variantId: string;
  sku?: string;
  pricing?: unknown;
  attributes?: unknown;
  gtin?: string;
  mpn?: string;
  shippingMeasurements?: unknown;
  stock?: unknown;
}

const updateProductVariant: ActionDefinition<Input, Record<string, unknown>> = {
  key: "update-product-variant",
  type: "perform",
  resource: "product-variant",
  title: "Update Product Variant",
  description:
    "Update a variant's SKU, pricing, attributes, GTIN, MPN, shipping measurements or stock. " +
    "Every field is optional and sent in Squarespace's `{present, value}` Change wrapper, " +
    "which this action builds for you.",
  idempotent: true,
  params: [
    {
      key: "productId",
      label: "Product id",
      type: "string",
      required: true,
    },
    {
      key: "variantId",
      label: "Variant id",
      type: "string",
      required: true,
      hint: "The variant's `id` from Create product variant, List inventory or the product read.",
    },
    {
      key: "sku",
      label: "SKU",
      type: "string",
      advanced: true,
      validation: { maxLength: 60 },
    },
    {
      key: "pricing",
      label: "Pricing",
      type: "json",
      advanced: true,
      placeholder: '{"basePrice":{"present":true,"value":{"currency":"USD","value":29.99}}}',
      hint: "As on Update product, `pricing`'s value holds `basePrice`/`onSale`/`salePrice` " +
        "each themselves `{present, value}`. The outer wrapper is built for you.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      advanced: true,
      hint: "Replaces the variant's attribute map (≤6 pairs, 100 characters each).",
    },
    {
      key: "gtin",
      label: "GTIN",
      type: "string",
      advanced: true,
      hint: "8, 12, 13 or 14 numeric digits.",
    },
    { key: "mpn", label: "MPN", type: "string", advanced: true },
    { key: "shippingMeasurements", label: "Shipping measurements", type: "json", advanced: true },
    {
      key: "stock",
      label: "Stock",
      type: "json",
      advanced: true,
      placeholder: '{"quantity":4,"unlimited":false}',
    },
  ],
  output: variantOutput,

  execute(input, ctx) {
    const body = changeBody({
      sku: input.sku,
      pricing: jsonParam(input.pricing, "pricing"),
      attributes: jsonParam(input.attributes, "attributes"),
      gtin: input.gtin,
      mpn: input.mpn,
      shippingMeasurements: jsonParam(input.shippingMeasurements, "shippingMeasurements"),
      stock: jsonParam(input.stock, "stock"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error(
        "supply at least one field to change — Squarespace treats a body with no Change " +
          "members as a no-op",
      );
    }

    const productId = encodeURIComponent(String(input.productId ?? "").trim());
    const variantId = encodeURIComponent(String(input.variantId ?? "").trim());
    return new SquarespaceClient(ctx).post<Record<string, unknown>>(
      `${API_V2}/commerce/products/${productId}/variants/${variantId}`,
      body,
    );
  },
};

export default updateProductVariant;
