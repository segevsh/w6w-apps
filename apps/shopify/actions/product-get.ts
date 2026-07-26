import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient, unset } from "../lib/client.ts";

interface Input {
  productId: number;
  fields?: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch a product by id.",
  params: [
    { key: "productId", label: "Product ID", type: "number", required: true },
    { key: "fields", label: "Fields", type: "string", hint: "Comma-separated field list." },
  ],
  output: [
    { key: "product.id", type: "number", label: "Product ID" },
    { key: "product.title", type: "string", label: "Title" },
    { key: "product.status", type: "string", label: "Status" },
    { key: "product.variants", type: "array", label: "Variants" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request(`/products/${input.productId}.json`, {
      query: { fields: unset(input.fields) },
    });
  },
};

export default productGet;
