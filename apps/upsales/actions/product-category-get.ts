import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/productCategories/{id}` — Fetch one product category by ID. */
interface Input {
  id: number;
}

const productCategoryGet: ActionDefinition<Input> = {
  key: "product-category-get",
  type: "read",
  resource: "product",
  title: "Get Product Category",
  description: "Fetch one product category by ID.",
  params: [idParam("id", "Product Category ID")],
  output: [{ key: "data", type: "object", label: "The product category" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data(
      "GET",
      `/productCategories/${encodeId(input.id)}`,
    );
    return { data };
  },
};

export default productCategoryGet;
