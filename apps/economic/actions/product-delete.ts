import type { ActionDefinition } from "@w6w/types";
import { EconomicClient, seg } from "../lib/client.ts";

const productDelete: ActionDefinition<{ productNumber: string }> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description: "Delete a product by its product number.",
  idempotent: false,
  params: [{ key: "productNumber", label: "Product number", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  async execute(input, ctx) {
    await new EconomicClient(ctx).request("DELETE", `/products/${seg(input.productNumber)}`);
    return { deleted: true };
  },
};

export default productDelete;
