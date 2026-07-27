import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  productId: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Retrieve a single product by ID.",
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "sku", type: "string", label: "SKU" },
    { key: "price", type: "string", label: "Price" },
    { key: "stock_status", type: "string", label: "Stock Status" },
    { key: "permalink", type: "string", label: "Permalink" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request(`/products/${input.productId}`);
  },
};

export default productGet;
