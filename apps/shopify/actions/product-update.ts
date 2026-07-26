import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  productId: number;
  title?: string;
  bodyHtml?: string;
  vendor?: string;
  productType?: string;
  status?: string;
  tags?: string;
}

const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Update a product's fields. Variants are edited through their own endpoints.",
  // A PUT writes absolute values, so replaying converges.
  idempotent: true,
  params: [
    { key: "productId", label: "Product ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "bodyHtml", label: "Description", type: "text", config: { multiline: true } },
    { key: "vendor", label: "Vendor", type: "string", row: "class" },
    { key: "productType", label: "Product type", type: "string", row: "class" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
      ],
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. REPLACES the product's current tags.",
    },
  ],
  output: [
    { key: "product.id", type: "number", label: "Product ID" },
    { key: "product.status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/products/${input.productId}.json`, {
      method: "PUT",
      body: {
        product: {
          id: input.productId,
          title: unset(input.title),
          body_html: unset(input.bodyHtml),
          vendor: unset(input.vendor),
          product_type: unset(input.productType),
          status: unset(input.status),
          tags: unset(input.tags),
        },
      },
    });
  },
};

export default productUpdate;
