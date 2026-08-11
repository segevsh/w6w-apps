import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, bool, flag01, toList } from "../lib/client.ts";
import {
  directionParam,
  type FieldSelectionInput,
  fieldSelectionParams,
  fieldSelectionQuery,
  paginationParams,
  productAvailabilityOptions,
  productConditionOptions,
  productIncludeOptions,
  productSortOptions,
  productTypeOptions,
} from "../lib/params.ts";

/**
 * `GET /v3/catalog/products` — the store's products.
 *
 * The two boolean filters here are spelled differently *by the vendor*, and this
 * is the action where that bites: `is_visible` is `type: boolean` in the schema
 * (so `true` / `false`) while `is_featured` is `type: integer`, described as
 * "`1` for true, `0` for false". Sending `is_featured=true` filters on nothing
 * and silently returns the whole catalog. See `bool` / `flag01` in `lib/client.ts`.
 *
 * `keyword` is the broad search: the vendor documents it as matching the `name`,
 * `description` and `sku` fields and the brand name.
 */
interface Input extends FieldSelectionInput {
  keyword?: string;
  name?: string;
  sku?: string;
  brandId?: number;
  categoryId?: number;
  type?: string;
  condition?: string;
  availability?: string;
  isVisible?: boolean;
  isFeatured?: boolean;
  dateModifiedMin?: string;
  include?: string[];
  sort?: string;
  direction?: string;
  limit?: number;
  page?: number;
}

const productList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "Search the store's catalog with the v3 Products filters.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      hint: "Matches the product name, description and SKU, and the brand name.",
    },
    { key: "name", label: "Exact name", type: "string", advanced: true },
    {
      key: "sku",
      label: "Main SKU",
      type: "string",
      hint: "The product's own SKU, not a variant's.",
    },
    { key: "brandId", label: "Brand ID", type: "number", validation: { integer: true } },
    {
      key: "categoryId",
      label: "Category ID",
      type: "number",
      validation: { integer: true },
      hint: "Returns only products assigned exclusively to this category.",
    },
    { key: "type", label: "Type", type: "select", options: productTypeOptions },
    { key: "condition", label: "Condition", type: "select", options: productConditionOptions },
    {
      key: "availability",
      label: "Availability",
      type: "select",
      options: productAvailabilityOptions,
    },
    { key: "isVisible", label: "Visible on the storefront", type: "boolean" },
    { key: "isFeatured", label: "Featured", type: "boolean" },
    {
      key: "dateModifiedMin",
      label: "Modified since",
      type: "string",
      advanced: true,
      placeholder: "2026-08-01T00:00:00Z",
      hint: "Sent as `date_modified:min`. A date alone is accepted; a full timestamp is exact.",
    },
    {
      key: "include",
      label: "Include sub-resources",
      type: "multiselect",
      options: productIncludeOptions,
      hint: "Off by default, matching the API. Including variants on a large catalog multiplies " +
        "the response size.",
    },
    { key: "sort", label: "Sort by", type: "select", options: productSortOptions },
    directionParam,
    ...paginationParams(),
    ...fieldSelectionParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Products" },
    { key: "pagination", type: "object", label: "Pagination (total, total_pages, links)" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/catalog/products", {
      query: {
        keyword: input.keyword,
        name: input.name,
        sku: input.sku,
        brand_id: input.brandId,
        categories: input.categoryId,
        type: input.type,
        condition: input.condition,
        availability: input.availability,
        // `type: boolean` in the vendor schema.
        is_visible: bool(input.isVisible),
        // `type: integer`, "1 for true, 0 for false", in the same schema.
        is_featured: flag01(input.isFeatured),
        "date_modified:min": input.dateModifiedMin,
        include: toList(input.include),
        sort: input.sort,
        direction: input.direction,
        limit: input.limit,
        page: input.page,
        ...fieldSelectionQuery(input),
      },
    });
  },
};

export default productList;
