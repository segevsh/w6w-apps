import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, bool, toList } from "../lib/client.ts";
import {
  type FieldSelectionInput,
  fieldSelectionParams,
  fieldSelectionQuery,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /v3/catalog/trees/categories` — the store's categories.
 *
 * **Not `/v3/catalog/categories`.** That path still answers, and its OpenAPI
 * operation does *not* set `deprecated: true` — but BigCommerce's Deprecations
 * and Sunsets page lists `/v3/catalog/categories` as deprecated in favour of the
 * Category Trees endpoints, and every one of its operation descriptions opens
 * with "When possible, use the [Catalog Trees …] endpoint instead."
 *
 * That gap is the whole reason this comment exists: a client generated from the
 * machine-readable spec alone would have shipped the deprecated path, because
 * nothing in the spec flags it. The v3-to-v3 deprecation is easy to miss even
 * when you know to look for v2-to-v3 ones.
 *
 * The trees form is also the only one that works on a multi-storefront store:
 * the old endpoint is documented as being "for categories of a default
 * BigCommerce storefront (`channel_id=1`)", so on a store with several channels
 * it quietly returns a subset.
 */
interface Input extends FieldSelectionInput {
  name?: string;
  nameLike?: string;
  keyword?: string;
  treeIds?: string;
  parentIds?: string;
  isVisible?: boolean;
  limit?: number;
  page?: number;
}

const categoryList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "category-list",
  type: "search",
  resource: "category",
  title: "List Categories",
  description:
    "List categories across every category tree. Uses the current Category Trees endpoint, not " +
    "the deprecated flat one.",
  params: [
    { key: "name", label: "Exact name", type: "string" },
    { key: "nameLike", label: "Name contains", type: "string", hint: "Sent as `name:like`." },
    { key: "keyword", label: "Keyword", type: "string" },
    {
      key: "treeIds",
      label: "Tree IDs",
      type: "string",
      placeholder: "1,2",
      hint: "Comma-separated. Sent as `tree_id:in`. Use List Category Trees to find them.",
    },
    {
      key: "parentIds",
      label: "Parent category IDs",
      type: "string",
      placeholder: "0",
      hint: "Comma-separated. Sent as `parent_id:in`. `0` returns the top level of a tree.",
    },
    { key: "isVisible", label: "Visible on the storefront", type: "boolean" },
    ...paginationParams(),
    ...fieldSelectionParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Categories" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/catalog/trees/categories", {
      query: {
        name: input.name,
        "name:like": input.nameLike,
        keyword: input.keyword,
        "tree_id:in": toList(input.treeIds),
        "parent_id:in": toList(input.parentIds),
        is_visible: bool(input.isVisible),
        limit: input.limit,
        page: input.page,
        ...fieldSelectionQuery(input),
      },
    });
  },
};

export default categoryList;
