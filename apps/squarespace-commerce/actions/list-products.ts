import type { ActionDefinition } from "@w6w/types";
import { API_V2, SquarespaceClient } from "../lib/client.ts";
import { cursorParam, modifiedParams, modifiedWindow, paginationOutput } from "../lib/params.ts";

/**
 * `GET /v2/commerce/products` — up to 50 products.
 *
 * Note the version: products live under **`/v2`**, everything else in this app
 * under `/1.0`. The vendor's navigation also aliases the resource to
 * `/v1/commerce/products`; the request examples and the live host use `/v2`.
 *
 * `type` is documented as `string[]` and is sent as a **repeated** query
 * parameter (`?type=PHYSICAL&type=SERVICE`), which is what the reference page's
 * own example URL shows — not a comma-joined value. The documented values are
 * `PHYSICAL`, `SERVICE`, `GIFT_CARD` and `DIGITAL`; the param is free text so a
 * type the vendor adds later is not blocked here.
 *
 * `query` is a free-text search across the catalogue ("title, SKU, tags" in the
 * vendor's description), and unlike the cursor it composes with the filters.
 */
export interface ProductListResponseV2 {
  pagination?: { hasNextPage?: boolean; nextPageCursor?: string; nextPageUrl?: string };
  products?: Array<Record<string, unknown>>;
}

interface Input {
  cursor?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  query?: string;
  type?: string[];
}

const listProducts: ActionDefinition<Input, ProductListResponseV2> = {
  key: "list-products",
  type: "search",
  resource: "product",
  title: "List Products",
  description:
    "List up to 50 products, optionally filtered by a free-text query, a modified-date window, " +
    "or one or more product types.",
  params: [
    cursorParam(),
    ...modifiedParams(),
    {
      key: "query",
      label: "Query",
      type: "string",
      advanced: true,
      hint: "Free-text match over the catalogue (title, SKU and tags).",
    },
    {
      key: "type",
      label: "Product types",
      type: "array",
      item: { type: "string", placeholder: "PHYSICAL" },
      advanced: true,
      hint: "One or more of `PHYSICAL`, `SERVICE`, `GIFT_CARD`, `DIGITAL`. Sent as a repeated " +
        "`type` query parameter, not a comma-joined value.",
    },
  ],
  output: [paginationOutput, {
    key: "products",
    type: "array",
    label: "Products (`id`, `type`, `name`, `pricing`, `storePageId`, …)",
  }],

  execute(input, ctx) {
    const { modifiedAfter, modifiedBefore } = modifiedWindow(input);
    const types = input.type?.filter(Boolean) ?? [];
    return new SquarespaceClient(ctx).get<ProductListResponseV2>(
      `${API_V2}/commerce/products`,
      {
        cursor: input.cursor,
        modifiedAfter,
        modifiedBefore,
        query: input.query,
        type: types.length > 0 ? types : undefined,
      },
    );
  },
};

export default listProducts;
