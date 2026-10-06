import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";

interface Input {
  variantId: number;
}

/** `GET /products/variant/{variantId}` — Get one catalog variant (a size/colour of a product) and its parent product. */
const catalogVariantGet: ActionDefinition<Input> = {
  key: "catalog-variant-get",
  type: "read",
  resource: "catalog-variant",
  title: "Get Catalog Variant",
  description: "Get one catalog variant (a size/colour of a product) and its parent product.",
  params: [
    {
      key: "variantId",
      label: "Variant ID",
      type: "number",
      required: true,
      hint: "Catalog variant id, e.g. from Get Catalog Product.",
    },
  ],
  output: [
    { key: "variant", type: "object", label: "Variant" },
    { key: "product", type: "object", label: "Product" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/products/variant/${seg(input.variantId)}`,
    );
    return result ?? {};
  },
};

export default catalogVariantGet;
