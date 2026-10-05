import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, toList } from "../lib/client.ts";

/**
 * `POST /v2/products`
 * Needs the `edit_products` or `account` scope.
 */
interface Input {
  name: string;
  description?: string;
  customPermalink?: string;
  price: number;
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
  nativeType?: string;
  subscriptionDuration?: string;
  published?: boolean;
  draft?: boolean;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description:
    "Create a product. It is published immediately unless Published is false or Save as draft is set. Needs the `edit_products` or `account` scope.",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "description", "label": "Description", "type": "text", "hint": "HTML." },
    { "key": "customPermalink", "label": "Custom permalink", "type": "string" },
    {
      "key": "price",
      "label": "Price",
      "type": "number",
      "required": true,
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
    {
      "key": "nativeType",
      "label": "Product type",
      "type": "select",
      "hint": "Cannot be changed later. Default `digital`.",
      "options": [
        { "value": "digital", "label": "digital" },
        { "value": "course", "label": "course" },
        { "value": "ebook", "label": "ebook" },
        { "value": "membership", "label": "membership" },
        { "value": "bundle", "label": "bundle" },
        { "value": "coffee", "label": "coffee" },
        { "value": "call", "label": "call" },
        { "value": "commission", "label": "commission" },
      ],
    },
    {
      "key": "subscriptionDuration",
      "label": "Subscription duration",
      "type": "select",
      "hint": "Memberships only.",
      "options": [
        { "value": "monthly", "label": "monthly" },
        { "value": "quarterly", "label": "quarterly" },
        { "value": "biannually", "label": "biannually" },
        { "value": "yearly", "label": "yearly" },
        { "value": "every_two_years", "label": "every_two_years" },
      ],
    },
    {
      "key": "published",
      "label": "Published",
      "type": "boolean",
      "hint":
        "False saves an unpublished draft. Default true; if publishing is blocked (unconfirmed email, no payout method) Gumroad saves a draft and returns a warning.",
    },
    { "key": "draft", "label": "Save as draft", "type": "boolean" },
  ],
  output: [{ "key": "id", "type": "string", "label": "Product id" }, {
    "key": "name",
    "type": "string",
    "label": "Name",
  }, { "key": "published", "type": "boolean", "label": "Whether it is live" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("POST", `/products`, {
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
        native_type: input.nativeType,
        subscription_duration: input.subscriptionDuration,
        published: input.published,
        draft: input.draft,
      },
    });
    return body.product;
  },
};

export default productCreate;
