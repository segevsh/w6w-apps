import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  product_id: number;
}

const productDelete: ActionDefinition<Input> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description: "Delete a product by ID. Needs the `products.read_write` scope.",
  idempotent: true,
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
      "key": "deleted",
      "type": "boolean",
      "label": "True when Salla accepted the delete",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.delete(`/products/${seg(input.product_id)}`);
  },
};

export default productDelete;
