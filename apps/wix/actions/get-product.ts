import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  productId: string;
  fields?: string;
}

/** `GET /stores/v3/products/{productId}` — handler `wix.stores.catalog.v3.product:GetProduct`. */
const getProduct: ActionDefinition<Input> = {
  key: "get-product",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Retrieve a single Wix Stores product by id.",
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint:
        "Comma-separated extra field sets, e.g. `CURRENCY`, `INFO_SECTION`, `MERCHANT_DATA`. Omit for the default projection.",
    },
  ],
  output: [{ key: "product", type: "object", label: "Product" }],

  execute(input, ctx) {
    const params = new URLSearchParams();
    for (const f of (input.fields ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
      params.append("fields", f);
    }
    const qs = params.toString();
    return new WixClient(ctx).request(
      `/stores/v3/products/${encodeURIComponent(input.productId)}${qs ? `?${qs}` : ""}`,
    );
  },
};

export default getProduct;
