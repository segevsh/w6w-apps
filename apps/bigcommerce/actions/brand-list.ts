import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage } from "../lib/client.ts";
import {
  directionParam,
  type FieldSelectionInput,
  fieldSelectionParams,
  fieldSelectionQuery,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /v3/catalog/brands` — the store's brands.
 *
 * The v3 form, deliberately: `/v2/brands` is on BigCommerce's Deprecations and
 * Sunsets list with this endpoint named as its replacement.
 *
 * `sort` accepts exactly one value here — `name` — per
 * `CatalogBrandsGetParametersSort`, so it is a fixed choice rather than a
 * free-text field that would silently do nothing.
 */
interface Input extends FieldSelectionInput {
  name?: string;
  nameLike?: string;
  direction?: string;
  limit?: number;
  page?: number;
}

const brandList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "brand-list",
  type: "search",
  resource: "brand",
  title: "List Brands",
  description: "List catalog brands, optionally filtered by exact or partial name.",
  params: [
    { key: "name", label: "Exact name", type: "string" },
    {
      key: "nameLike",
      label: "Name contains",
      type: "string",
      hint: "Sent as `name:like`, a SQL LIKE match.",
    },
    directionParam,
    ...paginationParams(),
    ...fieldSelectionParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Brands" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/catalog/brands", {
      query: {
        name: input.name,
        "name:like": input.nameLike,
        // The vendor's enum for this parameter has exactly one member.
        sort: input.direction ? "name" : undefined,
        direction: input.direction,
        limit: input.limit,
        page: input.page,
        ...fieldSelectionQuery(input),
      },
    });
  },
};

export default brandList;
