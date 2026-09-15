import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/** `GET /products/{id}` — one product's countries, currencies and amount bands (`skus`). */
interface Input {
  id: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Retrieve one reward product by ID.",
  params: [{ key: "id", label: "Product ID", type: "string", required: true }],
  output: [{ key: "product", type: "object", label: "The product" }],

  async execute(input, ctx) {
    const body = await new TremendousClient(ctx).json<{ product: unknown }>(
      `/products/${encodeURIComponent(input.id)}`,
    );
    return body.product;
  },
};

export default productGet;
