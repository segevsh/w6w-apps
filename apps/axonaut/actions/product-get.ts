import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/products/{productId}` — Get one product by id.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  productId: number;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Get one product by id.",
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the product.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Product ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "product_code", type: "string", label: "Product code" },
    { key: "price", type: "number", label: "Unit price" },
    { key: "tax_rate", type: "number", label: "Tax rate" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/products/${encodeId(input.productId)}`);
  },
};

export default productGet;
