import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId, mergeBody, numList } from "../lib/client.ts";
import { extraFieldsParam, productIdParam } from "../lib/params.ts";

/**
 * `PUT /products/{productId}` — update a product.
 *
 * Scope note the vendor states on the page: this call is for the product as a
 * whole. Moving **stock** has its own endpoint (`product-stock-adjust`) because
 * a delta is not a value, and `PUT /products/{id}` cannot express "sell one".
 * Requested categories replace the product's category list rather than adding to
 * it — the assign/unassign calls under `/categories` are the ones that add.
 *
 * Answers `{"updateCount": 1}`.
 *
 * Marked idempotent: `PUT` of the same body leaves the same state, so a retried
 * request cannot double-apply anything.
 */
interface Input {
  productId: string;
  name?: string;
  price?: number;
  sku?: string;
  quantity?: number;
  unlimited?: boolean;
  inStock?: boolean;
  enabled?: boolean;
  weight?: number;
  isShippingRequired?: boolean;
  compareToPrice?: number;
  description?: string;
  categoryIds?: string;
  defaultCategoryId?: number;
  showOnFrontpage?: boolean;
  isGiftCard?: boolean;
  discountsAllowed?: boolean;
  extraFields?: unknown;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description:
    "Update a product. Fields left empty are not sent, so they keep their current value.",
  idempotent: true,
  params: [
    productIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "price", label: "Price", type: "number", validation: { min: 0 } },
    { key: "sku", label: "SKU", type: "string" },
    { key: "quantity", label: "Quantity", type: "number", validation: { min: 0 } },
    {
      key: "unlimited",
      label: "Unlimited stock",
      type: "boolean",
      hint: "When on, `quantity` is ignored and the product never goes out of stock.",
    },
    { key: "inStock", label: "In stock", type: "boolean" },
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "weight", label: "Weight", type: "number", validation: { min: 0 } },
    {
      key: "isShippingRequired",
      label: "Requires shipping",
      type: "boolean",
      advanced: true,
    },
    {
      key: "compareToPrice",
      label: "Compare-to price",
      type: "number",
      validation: { min: 0 },
    },
    { key: "description", label: "Description", type: "text", hint: "HTML is accepted." },
    {
      key: "categoryIds",
      label: "Category IDs",
      type: "string",
      placeholder: "9691094,9691095",
      hint: "Replaces the product's category list entirely. Already-assigned categories must be " +
        "listed again to keep them.",
    },
    {
      key: "defaultCategoryId",
      label: "Default category ID",
      type: "number",
      validation: { integer: true, min: 0 },
      advanced: true,
    },
    { key: "showOnFrontpage", label: "Show on front page", type: "boolean", advanced: true },
    { key: "isGiftCard", label: "Gift card", type: "boolean", advanced: true },
    { key: "discountsAllowed", label: "Discounts allowed", type: "boolean", advanced: true },
    extraFieldsParam,
  ],
  output: [
    { key: "updateCount", type: "number", label: "1 when the product was updated" },
  ],

  execute(input, ctx) {
    const body = mergeBody({
      name: input.name,
      price: input.price,
      sku: input.sku,
      quantity: input.quantity,
      unlimited: input.unlimited,
      inStock: input.inStock,
      enabled: input.enabled,
      weight: input.weight,
      isShippingRequired: input.isShippingRequired,
      compareToPrice: input.compareToPrice,
      description: input.description,
      categoryIds: numList(input.categoryIds),
      defaultCategoryId: input.defaultCategoryId,
      showOnFrontpage: input.showOnFrontpage,
      isGiftCard: input.isGiftCard,
      discountsAllowed: input.discountsAllowed,
    }, input.extraFields);
    return new EcwidClient(ctx).json(`/products/${encodeId(input.productId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default productUpdate;
