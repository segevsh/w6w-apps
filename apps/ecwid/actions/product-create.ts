import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, mergeBody, numList } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /products` — create a product.
 *
 * `name`, `price` and `sku` are the three fields the vendor marks
 * **Required** on this page. They are declared as such here rather than
 * discovered from a `400 WRONG_PARAMETER` at run time.
 *
 * The response is `{"id": <new product id>}` — an id, not the product, so a
 * workflow that needs the created record calls Get Product with it.
 *
 * Not idempotent: Ecwid mints the id and accepts no client-supplied idempotency
 * key, so a retried create makes a second product.
 */
interface Input {
  name: string;
  price: number;
  sku: string;
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

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a catalog product. Name, price and SKU are required by the API.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "price", label: "Price", type: "number", required: true, validation: { min: 0 } },
    {
      key: "sku",
      label: "SKU",
      type: "string",
      required: true,
      hint: "Marked Required by the API. A product with variations inherits this SKU unless a " +
        "variation overrides it.",
    },
    { key: "quantity", label: "Quantity", type: "number", validation: { min: 0 } },
    {
      key: "unlimited",
      label: "Unlimited stock",
      type: "boolean",
      hint: "When on, Ecwid ignores `quantity` and the product never goes out of stock.",
    },
    {
      key: "inStock",
      label: "In stock",
      type: "boolean",
      hint: "Whether the product (or any of its variations) is in stock.",
    },
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
      hint: "Pre-sale price shown struck through next to `price`.",
    },
    { key: "description", label: "Description", type: "text", hint: "HTML is accepted." },
    {
      key: "categoryIds",
      label: "Category IDs",
      type: "string",
      placeholder: "9691094,9691095",
      hint: "Comma-separated category IDs. Sent as the JSON array of numbers Ecwid expects.",
    },
    {
      key: "defaultCategoryId",
      label: "Default category ID",
      type: "number",
      validation: { integer: true, min: 0 },
      advanced: true,
      hint: "The category whose breadcrumb the product appears under. `0` means no default, so " +
        "the product is not listed anywhere in the storefront.",
    },
    {
      key: "showOnFrontpage",
      label: "Show on front page",
      type: "boolean",
      advanced: true,
    },
    { key: "isGiftCard", label: "Gift card", type: "boolean", advanced: true },
    {
      key: "discountsAllowed",
      label: "Discounts allowed",
      type: "boolean",
      advanced: true,
      hint: "Whether store or coupon discounts may apply to this product.",
    },
    extraFieldsParam,
  ],
  output: [{ key: "id", type: "number", label: "ID of the created product" }],

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
    return new EcwidClient(ctx).json("/products", { method: "POST", body });
  },
};

export default productCreate;
