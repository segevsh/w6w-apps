import type { ActionDefinition } from "@w6w/types";
import { API_V2, compact, jsonParam, SquarespaceClient } from "../lib/client.ts";
import { variantOutput } from "../lib/params.ts";

/**
 * `POST /v2/commerce/products/{productId}/variants` — add a variant.
 *
 * ## `sku` and `pricing` are both required
 *
 * `sku` is unique among the product's variants, whitespace-trimmed and at most
 * 60 characters. `pricing` is the odd one: the page's prose says it is "present
 * for DIGITAL only", while the schema marks it required generally — so this
 * action always sends `pricing.basePrice` rather than letting a PHYSICAL
 * variant fail on a schema rule its prose contradicts.
 *
 * ## The physical-only members
 *
 * `attributes` (at most six key/value pairs, 100 characters each), `gtin` (8,
 * 12, 13 or 14 numeric digits), `mpn` (alphanumeric, ≤70 characters),
 * `shippingMeasurements` and `stock` are documented for **PHYSICAL** products
 * only. They are passed through as supplied rather than validated here: the
 * vendor's error body names the offending member, and a wrong local rule would
 * block a call the API accepts.
 *
 * Answers `201` with the created `ProductVariantV2`.
 */
interface Input {
  productId: string;
  sku: string;
  pricing: unknown;
  attributes?: unknown;
  gtin?: string;
  mpn?: string;
  shippingMeasurements?: unknown;
  stock?: unknown;
}

const createProductVariant: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-product-variant",
  type: "perform",
  resource: "product-variant",
  title: "Create Product Variant",
  description:
    "Add a variant to a product. `sku` (≤60 characters, unique per product) and `pricing` " +
    "are required; `attributes`, `gtin`, `mpn`, `shippingMeasurements` and `stock` are " +
    "physical-product-only.",
  idempotent: false,
  params: [
    {
      key: "productId",
      label: "Product id",
      type: "string",
      required: true,
      hint: "The product to add the variant to.",
    },
    {
      key: "sku",
      label: "SKU",
      type: "string",
      required: true,
      validation: { maxLength: 60 },
      hint: "Unique among the product's variants. Whitespace is trimmed by Squarespace.",
    },
    {
      key: "pricing",
      label: "Pricing",
      type: "json",
      required: true,
      placeholder: '{"basePrice":{"currency":"USD","value":29.99}}',
      hint: "`basePrice` (`{currency, value}`) is required; `onSale` and `salePrice` are " +
        "optional. The vendor's prose calls this DIGITAL-only while its schema marks it " +
        "required generally — this action always sends it.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      advanced: true,
      placeholder: '{"Color":"Blue","Size":"M"}',
      hint: "Up to six key/value pairs, 100 characters each. PHYSICAL products only.",
    },
    {
      key: "gtin",
      label: "GTIN",
      type: "string",
      advanced: true,
      hint: "8, 12, 13 or 14 numeric digits. PHYSICAL products only.",
    },
    {
      key: "mpn",
      label: "MPN",
      type: "string",
      advanced: true,
      hint: "Alphanumeric, up to 70 characters. PHYSICAL products only.",
    },
    {
      key: "shippingMeasurements",
      label: "Shipping measurements",
      type: "json",
      advanced: true,
      hint: "Weight and dimensions, in the website's measurement standard. PHYSICAL only.",
    },
    {
      key: "stock",
      label: "Stock",
      type: "json",
      advanced: true,
      placeholder: '{"quantity":10,"unlimited":false}',
      hint: "`{quantity, unlimited}`. PHYSICAL products only; omit it for an untracked variant.",
    },
  ],
  output: variantOutput,

  execute(input, ctx) {
    const productId = encodeURIComponent(String(input.productId ?? "").trim());
    const body = compact({
      sku: input.sku,
      pricing: jsonParam(input.pricing, "pricing"),
      attributes: jsonParam(input.attributes, "attributes"),
      gtin: input.gtin,
      mpn: input.mpn,
      shippingMeasurements: jsonParam(input.shippingMeasurements, "shippingMeasurements"),
      stock: jsonParam(input.stock, "stock"),
    });
    return new SquarespaceClient(ctx).post<Record<string, unknown>>(
      `${API_V2}/commerce/products/${productId}/variants`,
      body,
    );
  },
};

export default createProductVariant;
