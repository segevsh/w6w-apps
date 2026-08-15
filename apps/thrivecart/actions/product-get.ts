import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { modeParam, productIdParam } from "../lib/params.ts";

/** `GET /products/:product_id` — one product's full definition. */
interface Input {
  productId: string;
  mode?: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product by ID.",
  params: [productIdParam, modeParam],
  output: [
    { key: "product_id", type: "string", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "label", type: "string", label: "Internal label" },
    { key: "status", type: "string", label: "Status code" },
    { key: "statusString", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type code" },
    { key: "typeString", type: "string", label: "Type" },
    { key: "payment_currency", type: "string", label: "Currency" },
    { key: "url", type: "string", label: "Checkout URL" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(`/products/${encodeId(input.productId)}`, {
      mode: input.mode,
    });
  },
};

export default productGet;
