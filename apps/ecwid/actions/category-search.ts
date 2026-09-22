import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, type EcwidListPage } from "../lib/client.ts";
import { paginationParams, responseFieldsParam } from "../lib/params.ts";

/**
 * `GET /categories` — search the category tree.
 *
 * Ecwid's categories are a tree, and this endpoint is how you walk it: `parent`
 * returns one level, `parentIds` several, and `withSubcategories` the whole
 * subtree beneath them. Disabled categories are **excluded unless asked for**
 * (`hidden_categories`), which is the one default here that regularly surprises
 * people — a category that exists in the admin and is missing from a search is
 * usually disabled.
 */
interface Input {
  keyword?: string;
  parent?: number;
  parentIds?: string;
  withSubcategories?: boolean;
  hidden_categories?: boolean;
  lang?: string;
  limit?: number;
  offset?: number;
  responseFields?: string;
}

const categorySearch: ActionDefinition<Input> = {
  key: "category-search",
  type: "search",
  resource: "category",
  title: "Search Categories",
  description: "Search categories by name, parent, or subtree.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      hint: "Search term for the category name and description.",
    },
    {
      key: "parent",
      label: "Parent category ID",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Returns only the categories directly inside this one. `0` is the store's top level.",
    },
    {
      key: "parentIds",
      label: "Parent category IDs",
      type: "string",
      advanced: true,
      placeholder: "9691094,9691095",
      hint: "Comma-separated parent IDs. Combined with `parent` when both are set rather than " +
        "replacing it.",
    },
    {
      key: "withSubcategories",
      label: "Include subcategories",
      type: "boolean",
      hint: "Returns the full structure beneath the requested parents (subcategories of " +
        "subcategories), instead of only their direct children.",
    },
    {
      key: "hidden_categories",
      label: "Include disabled categories",
      type: "boolean",
      hint: "Off by default: disabled categories are not returned at all unless this is set.",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      placeholder: "en",
      advanced: true,
      hint: "ISO 639-1 code for translated fields.",
    },
    ...paginationParams(),
    responseFieldsParam,
  ],
  output: [
    { key: "items", type: "array", label: "Categories" },
    { key: "total", type: "number", label: "Total matching categories" },
    { key: "count", type: "number", label: "Categories in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size Ecwid used" },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json<EcwidListPage<unknown>>("/categories", {
      query: {
        keyword: input.keyword,
        parent: input.parent,
        parentIds: input.parentIds,
        withSubcategories: input.withSubcategories,
        hidden_categories: input.hidden_categories,
        lang: input.lang,
        limit: input.limit,
        offset: input.offset,
        responseFields: input.responseFields,
      },
    });
  },
};

export default categorySearch;
