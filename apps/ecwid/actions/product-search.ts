import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, type EcwidListPage } from "../lib/client.ts";
import { paginationParams, productSortByOptions, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /products` — search the catalog.
 *
 * The filters kept here are the ones a workflow reaches for; the page also
 * documents price/date ranges, `sku`, `productId`, storefront-visibility
 * switches, per-option and per-attribute filters, and `responseFields`. The
 * ones left out are documented, not guesswork — see the README.
 *
 * Two documented quirks worth knowing:
 *
 *  - `enabled` is a **tri-state**, not a flag: "Set `true` to get only enabled
 *    products. Set `false` to get only disabled products." So a `false` here is
 *    a real filter and the client sends it, rather than dropping it the way an
 *    absent boolean would be dropped.
 *  - Setting `category` makes Ecwid sort by `DEFINED_BY_STORE_OWNER`
 *    automatically, whatever `sortBy` says.
 */
interface Input {
  keyword?: string;
  sku?: string;
  category?: string;
  categories?: string;
  includeProductsFromSubcategories?: boolean;
  enabled?: boolean;
  inStock?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
  responseFields?: string;
}

const productSearch: ActionDefinition<Input> = {
  key: "product-search",
  type: "search",
  resource: "product",
  title: "Search Products",
  description:
    "Search the store's catalog by keyword, SKU, category, availability or enabled state.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      hint:
        "Searches name, description, SKU and variation SKUs, option values, category name, gallery " +
        "image descriptions and attribute values. Add `*` at the end to disable exact matching.",
    },
    {
      key: "sku",
      label: "SKU",
      type: "string",
      hint:
        "Product or variation SKU, exact match. When set, Ecwid ignores every other filter except " +
        "`productId`.",
    },
    {
      key: "category",
      label: "Category ID",
      type: "string",
      placeholder: "9691094",
      hint: "Products assigned to this one category. Ecwid then sorts by store-owner order.",
    },
    {
      key: "categories",
      label: "Category IDs",
      type: "string",
      advanced: true,
      placeholder: "0,123456,138470508",
      hint: "Comma-separated category IDs; `0` means the uncategorised products.",
    },
    {
      key: "includeProductsFromSubcategories",
      label: "Include subcategories",
      type: "boolean",
      advanced: true,
      hint: "Only meaningful together with `categories`.",
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "On returns only enabled products, off only disabled ones, unset returns both.",
    },
    {
      key: "inStock",
      label: "In stock",
      type: "boolean",
      hint: "On returns only in-stock products, off only out-of-stock ones, unset returns both.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: productSortByOptions,
      advanced: true,
    },
    ...paginationParams(),
    responseFieldsParam,
  ],
  output: [
    { key: "items", type: "array", label: "Products" },
    { key: "total", type: "number", label: "Total matching products" },
    { key: "count", type: "number", label: "Products in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size Ecwid used" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json<EcwidListPage<unknown>>("/products", {
      query: {
        keyword: input.keyword,
        sku: input.sku,
        category: input.category,
        categories: input.categories,
        includeProductsFromSubcategories: input.includeProductsFromSubcategories,
        enabled: input.enabled,
        inStock: input.inStock,
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
        responseFields: input.responseFields,
      },
    });
  },
};

export default productSearch;
