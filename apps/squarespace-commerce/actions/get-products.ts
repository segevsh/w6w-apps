import type { ActionDefinition } from "@w6w/types";
import { API_V2, csvIds, MAX_CSV_IDS, SquarespaceClient } from "../lib/client.ts";
import { csvIdsParam } from "../lib/params.ts";

/**
 * `GET /v2/commerce/products/{productIdCsvs}` — specific products.
 *
 * Comma-separated product ids in the path, up to 50, answering
 * `{products: [...]}` with no pagination. The vendor's own 400 description for
 * this route is "the provided product IDs are invalid or exceed the maximum of
 * 50" — which is why the ceiling is enforced before the request.
 *
 * Unknown ids are omitted rather than erroring the whole call, so match the
 * results on `id`.
 */
export interface ProductListResponseV2 {
  products?: Array<Record<string, unknown>>;
}

interface Input {
  productIds: string;
}

const getProducts: ActionDefinition<Input, ProductListResponseV2> = {
  key: "get-products",
  type: "read",
  resource: "product",
  title: "Get Products",
  description: "Retrieve up to 50 specific products by id in one request.",
  params: [
    csvIdsParam(
      "productIds",
      "Product ids",
      "Product ids to retrieve, e.g. from List products' `id`.",
      MAX_CSV_IDS,
    ),
  ],
  output: [{
    key: "products",
    type: "array",
    label: "Products (`id`, `type`, `name`, `pricing`, `storePageId`, …)",
  }],

  execute(input, ctx) {
    const productIds = csvIds(input.productIds, { max: MAX_CSV_IDS, label: "productIds" });
    return new SquarespaceClient(ctx).get<ProductListResponseV2>(
      `${API_V2}/commerce/products/${productIds}`,
    );
  },
};

export default getProducts;
