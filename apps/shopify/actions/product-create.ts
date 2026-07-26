import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  title: string;
  bodyHtml?: string;
  vendor?: string;
  productType?: string;
  status?: string;
  tags?: string;
  variants?: unknown;
}

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a product. Shopify adds a default variant if none is supplied.",
  // Shopify mints a new product id per call and offers no request key.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "bodyHtml",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "HTML — this is the storefront description.",
    },
    { key: "vendor", label: "Vendor", type: "string", row: "class" },
    { key: "productType", label: "Product type", type: "string", row: "class" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "draft",
      options: [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
      ],
      hint: "Draft keeps it off the storefront until you publish.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated, as Shopify stores them.",
    },
    {
      key: "variants",
      label: "Variants",
      type: "json",
      hint: 'Array of variants, e.g. [{ "option1": "Small", "price": "9.99", "sku": "S-1" }].',
    },
  ],
  output: [
    { key: "product.id", type: "number", label: "Product ID" },
    { key: "product.title", type: "string", label: "Title" },
    { key: "product.handle", type: "string", label: "Handle" },
    { key: "product.variants", type: "array", label: "Variants" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request("/products.json", {
      method: "POST",
      body: {
        product: {
          title: input.title,
          body_html: unset(input.bodyHtml),
          vendor: unset(input.vendor),
          product_type: unset(input.productType),
          status: unset(input.status),
          tags: unset(input.tags),
          variants: input.variants,
        },
      },
    });
  },
};

export default productCreate;
