import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  product_id: number;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product by ID. Needs the `products.read` scope.",

  params: [
    {
      "key": "product_id",
      "label": "Product ID",
      "type": "number",
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
    return client.get(`/products/${seg(input.product_id)}`);
  },
};

export default productGet;
