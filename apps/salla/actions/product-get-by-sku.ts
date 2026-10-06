import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  sku: string;
}

const productGetBySku: ActionDefinition<Input> = {
  key: "product-get-by-sku",
  type: "read",
  resource: "product",
  title: "Get Product by SKU",
  description: "Fetch one product by its SKU. Needs the `products.read` scope.",

  params: [
    {
      "key": "sku",
      "label": "SKU",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get(`/products/sku/${seg(input.sku)}`);
  },
};

export default productGetBySku;
