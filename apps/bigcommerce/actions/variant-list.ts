import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, toList } from "../lib/client.ts";
import {
  type FieldSelectionInput,
  fieldSelectionParams,
  fieldSelectionQuery,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /v3/catalog/variants` — variants across the whole catalog.
 *
 * This is the endpoint to use to find a product **by variant SKU**. The `sku`
 * filter on `GET /v3/catalog/products` matches only the product's own main SKU,
 * as the vendor's own parameter description says ("To filter by variant SKU, see
 * Get all variants") — so searching a variant SKU there returns nothing and
 * looks like the product is missing.
 */
interface Input extends FieldSelectionInput {
  sku?: string;
  upc?: string;
  id?: number;
  productIds?: string;
  limit?: number;
  page?: number;
}

const variantList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "variant-list",
  type: "search",
  resource: "variant",
  title: "List Variants",
  description: "List variants across the catalog. The way to resolve a variant SKU to a product.",
  params: [
    {
      key: "sku",
      label: "Variant SKU",
      type: "string",
      hint: "Variant SKUs live here, not on the Products endpoint's `sku` filter.",
    },
    { key: "upc", label: "UPC", type: "string" },
    { key: "id", label: "Variant ID", type: "number", validation: { integer: true } },
    {
      key: "productIds",
      label: "Product IDs",
      type: "string",
      placeholder: "77,80",
      hint: "Comma-separated. Sent as `product_id:in`.",
    },
    ...paginationParams(),
    ...fieldSelectionParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Variants" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/catalog/variants", {
      query: {
        sku: input.sku,
        upc: input.upc,
        id: input.id,
        "product_id:in": toList(input.productIds),
        limit: input.limit,
        page: input.page,
        ...fieldSelectionQuery(input),
      },
    });
  },
};

export default variantList;
