import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  productId: string;
  force?: boolean;
}

const productDelete: ActionDefinition<Input> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description:
    "Delete a product. Defaults to a permanent delete (`force`); unset to move to trash.",
  idempotent: true,
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: true,
      hint: "Bypass trash and delete permanently.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request(`/products/${input.productId}`, {
      method: "DELETE",
      query: { force: input.force ?? true },
    });
  },
};

export default productDelete;
