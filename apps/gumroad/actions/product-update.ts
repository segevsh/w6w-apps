import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg, toList } from "../lib/client.ts";

/**
 * `PUT /v2/products/:product_id`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  productId: string;
  name?: string;
  description?: string;
  customPermalink?: string;
  price?: number;
  priceCurrencyType?: string;
  customizablePrice?: boolean;
  suggestedPriceCents?: number;
  maxPurchaseCount?: number;
  category?: string;
  taxonomyId?: number;
  tags?: string;
  customSummary?: string;
  refundPeriod?: string;
  refundFinePrint?: string;
  customReceipt?: string;
  quantityEnabled?: boolean;
  isAdult?: boolean;
  displayProductReviews?: boolean;
  shouldShowSalesCount?: boolean;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description:
    "Update a product. Send only the fields to change; Tags replace the whole set. Needs the `edit_products` or `account` scope.",
  idempotent: true,
  params: [
    {
      "key": "productId",
      "label": "Product ID",
      "type": "string",
      "required": true,
      "hint":
        "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
    },
    { "key": "name", "label": "Name", "type": "string" },
    { "key": "description", "label": "Description", "type": "text", "hint": "HTML." },
    { "key": "customPermalink", "label": "Custom permalink", "type": "string" },
    {
      "key": "price",
      "label": "Price",
      "type": "number",
      "hint": "In the smallest currency unit (cents for USD); `jpy` has no minor unit.",
    },
    {
      "key": "priceCurrencyType",
      "label": "Currency",
      "type": "string",
      "hint": "ISO currency code, e.g. `usd`. Defaults to the account currency.",
    },
    { "key": "customizablePrice", "label": "Pay what you want", "type": "boolean" },
    {
      "key": "suggestedPriceCents",
      "label": "Suggested price",
      "type": "number",
      "hint": "Cents. Used with pay-what-you-want.",
    },
    { "key": "maxPurchaseCount", "label": "Max purchase count", "type": "number" },
    {
      "key": "category",
      "label": "Category",
      "type": "string",
      "hint":
        "Full category path from List Categories, e.g. `design/ui-and-web/figma`. Cannot be combined with Taxonomy ID.",
    },
    {
      "key": "taxonomyId",
      "label": "Taxonomy ID",
      "type": "number",
      "hint": "Numeric category id; alias for Category. Cannot be combined with it.",
    },
    {
      "key": "tags",
      "label": "Tags",
      "type": "string",
      "hint": "Comma-separated. On update this REPLACES every existing tag.",
    },
    { "key": "customSummary", "label": "Custom summary", "type": "string" },
    {
      "key": "refundPeriod",
      "label": "Refund period",
      "type": "select",
      "hint":
        "Product-level policy; only available while the account-level refund policy is not in effect. `inherit` returns to the account default.",
      "options": [
        { "value": "inherit", "label": "inherit" },
        { "value": "none", "label": "none" },
        { "value": "7", "label": "7" },
        { "value": "14", "label": "14" },
        { "value": "30", "label": "30" },
        { "value": "183", "label": "183" },
      ],
    },
    {
      "key": "refundFinePrint",
      "label": "Refund fine print",
      "type": "string",
      "hint":
        "Needs a refund period unless the product already has one; cannot be combined with `inherit`. Empty clears it.",
    },
    { "key": "customReceipt", "label": "Custom receipt", "type": "string" },
    { "key": "quantityEnabled", "label": "Quantity enabled", "type": "boolean" },
    { "key": "isAdult", "label": "Adult content", "type": "boolean" },
    { "key": "displayProductReviews", "label": "Display reviews", "type": "boolean" },
    { "key": "shouldShowSalesCount", "label": "Show sales count", "type": "boolean" },
  ],
  output: [{ "key": "id", "type": "string", "label": "Product id" }, {
    "key": "name",
    "type": "string",
    "label": "Name",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("PUT", `/products/${seg(input.productId)}`, {
      form: {
        name: input.name,
        description: input.description,
        custom_permalink: input.customPermalink,
        price: input.price,
        price_currency_type: input.priceCurrencyType,
        customizable_price: input.customizablePrice,
        suggested_price_cents: input.suggestedPriceCents,
        max_purchase_count: input.maxPurchaseCount,
        category: input.category,
        taxonomy_id: input.taxonomyId,
        tags: toList(input.tags),
        custom_summary: input.customSummary,
        refund_period: input.refundPeriod,
        refund_fine_print: input.refundFinePrint,
        custom_receipt: input.customReceipt,
        quantity_enabled: input.quantityEnabled,
        is_adult: input.isAdult,
        display_product_reviews: input.displayProductReviews,
        should_show_sales_count: input.shouldShowSalesCount,
      },
    });
    return body.product;
  },
};

export default productUpdate;
