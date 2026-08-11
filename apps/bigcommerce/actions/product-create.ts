import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BigCommerceClient, compact } from "../lib/client.ts";
import { productConditionOptions, productTypeOptions } from "../lib/params.ts";

/**
 * `POST /v3/catalog/products` — create a product.
 *
 * Two things the vendor documents that are easy to get wrong:
 *
 *  - **Four fields are required**, per `product_Base_POST.required`: `name`,
 *    `type`, `weight` and `price`. `weight` is required even for a digital
 *    product; send `0`.
 *  - **The success status is 200, not 201.** The OpenAPI document lists only
 *    `200`, `409` and `422` for this operation. Code that keys off 201 will treat
 *    a successful create as a failure.
 *
 * `extraFields` exists because `product_Base_POST` has 50 properties and a
 * generated form for all of them would be unusable; the common ones are typed
 * and the rest merge in as JSON. Anything in `extraFields` wins, so a workflow
 * that already has a full product object can pass it whole.
 */
interface Input {
  name: string;
  type: string;
  price: number;
  weight: number;
  sku?: string;
  description?: string;
  brandId?: number;
  categories?: string;
  inventoryLevel?: number;
  isVisible?: boolean;
  condition?: string;
  extraFields?: unknown;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a catalog product. Name, type, price and weight are required by the API.",
  // Nothing to key an idempotent retry on: BigCommerce mints the product ID and
  // accepts no client-supplied idempotency key, so a retried create makes a
  // second product.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "physical",
      options: productTypeOptions,
    },
    { key: "price", label: "Price", type: "number", required: true, validation: { min: 0 } },
    {
      key: "weight",
      label: "Weight",
      type: "number",
      required: true,
      default: 0,
      validation: { min: 0 },
      hint: "Required by the API even for a digital product — send 0 there.",
    },
    { key: "sku", label: "SKU", type: "string" },
    { key: "description", label: "Description", type: "text", hint: "HTML is accepted." },
    { key: "brandId", label: "Brand ID", type: "number", validation: { integer: true } },
    {
      key: "categories",
      label: "Category IDs",
      type: "string",
      placeholder: "23,24",
      hint: "Comma-separated category IDs.",
    },
    {
      key: "inventoryLevel",
      label: "Inventory level",
      type: "number",
      validation: { integer: true },
    },
    { key: "isVisible", label: "Visible on the storefront", type: "boolean", default: true },
    { key: "condition", label: "Condition", type: "select", options: productConditionOptions },
    {
      key: "extraFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Merged into the request body, overriding the fields above. Use it for anything the " +
        "form does not cover — custom_url, meta_description, availability, and so on.",
    },
  ],
  output: [{ key: "id", type: "number", label: "New product ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const categories = (input.categories ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    const body = {
      ...compact({
        name: input.name,
        type: input.type,
        price: input.price,
        weight: input.weight,
        sku: input.sku,
        description: input.description,
        brand_id: input.brandId,
        categories: categories.length > 0 ? categories : undefined,
        inventory_level: input.inventoryLevel,
        is_visible: input.isVisible,
        condition: input.condition,
      }),
      ...(extra ?? {}),
    };
    return await new BigCommerceClient(ctx).v3("/catalog/products", { method: "POST", body });
  },
};

export default productCreate;
