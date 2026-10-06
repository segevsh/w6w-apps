import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/products/{id}` — Fetch one product by ID. */
interface Input {
  id: number;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product by ID.",
  params: [idParam("id", "Product ID")],
  output: [{ key: "data", type: "object", label: "The product" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/products/${encodeId(input.id)}`);
    return { data };
  },
};

export default productGet;
