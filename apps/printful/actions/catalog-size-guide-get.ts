import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";

interface Input {
  productId: number;
  unit?: string;
}

/** `GET /products/{productId}/sizes` — Get the size tables for a catalog product. */
const catalogSizeGuideGet: ActionDefinition<Input> = {
  key: "catalog-size-guide-get",
  type: "read",
  resource: "catalog-product",
  title: "Get Product Size Guide",
  description: "Get the size tables for a catalog product.",
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      required: true,
      hint: "Catalog product id.",
    },
    {
      key: "unit",
      label: "Unit",
      type: "string",
      hint: "Measurement unit for the tables, e.g. `inches` or `cm`.",
    },
  ],
  output: [
    { key: "product_id", type: "number", label: "Product ID" },
    { key: "available_sizes", type: "array", label: "Available sizes" },
    { key: "size_tables", type: "array", label: "Size tables" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/products/${seg(input.productId)}/sizes`,
      { query: { unit: input.unit } },
    );
    return result ?? {};
  },
};

export default catalogSizeGuideGet;
