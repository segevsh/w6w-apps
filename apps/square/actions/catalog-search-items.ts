import type { ActionDefinition } from "@w6w/types";
import { SquareClient, unset } from "../lib/client.ts";
import { cursor, limit, listOutput } from "../lib/params.ts";

interface Input {
  textFilter?: string;
  categoryIds?: string;
  enabledLocationIds?: string;
  productTypes?: string[];
  archivedState?: string;
  sortOrder?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `POST /v2/catalog/search-catalog-items` (SearchCatalogItems).
 *
 * Square ships two catalog searches and they are not interchangeable:
 * `/catalog/search` takes a general expression tree over any object type, while
 * this one is the purpose-built item search — free text over name, description
 * and SKU, plus category, location and product-type filters. This app exposes
 * the item search because it is what a commerce workflow actually reaches for;
 * the general expression search is deliberately left out rather than modelled
 * badly behind a JSON blob.
 */
const catalogSearchItems: ActionDefinition<Input> = {
  key: "catalog-search-items",
  type: "search",
  resource: "catalog",
  title: "Search Catalog Items",
  description:
    "Search catalog items and variations by free text, category, location, product type or archived state.",
  params: [
    {
      key: "textFilter",
      label: "Text",
      type: "string",
      hint:
        "Matches an item's `name`, `description` or `abbreviation`, or a variation's `name`, `sku` or `upc`.",
    },
    {
      key: "categoryIds",
      label: "Category IDs",
      type: "string",
      hint: "Comma-separated catalog category ids.",
    },
    {
      key: "enabledLocationIds",
      label: "Enabled at locations",
      type: "string",
      hint: "Comma-separated location ids; returns only items enabled at them.",
    },
    {
      key: "productTypes",
      label: "Product types",
      type: "multiselect",
      options: [
        { value: "REGULAR", label: "Regular" },
        { value: "GIFT_CARD", label: "Gift card" },
        { value: "APPOINTMENTS_SERVICE", label: "Appointments service" },
        { value: "FOOD_AND_BEV", label: "Food and beverage" },
        { value: "EVENT", label: "Event" },
        { value: "DIGITAL", label: "Digital" },
        { value: "DONATION", label: "Donation" },
      ],
    },
    {
      key: "archivedState",
      label: "Archived state",
      type: "select",
      options: [
        { value: "ARCHIVED_STATE_NOT_ARCHIVED", label: "Not archived" },
        { value: "ARCHIVED_STATE_ARCHIVED", label: "Archived" },
        { value: "ARCHIVED_STATE_ALL", label: "All" },
      ],
    },
    {
      key: "sortOrder",
      label: "Sort by name",
      type: "select",
      hint: "Square's default is ASC.",
      options: [
        { value: "ASC", label: "A to Z (ASC)" },
        { value: "DESC", label: "Z to A (DESC)" },
      ],
    },
    limit("Max results per page. Square's default is 100."),
    cursor,
  ],
  output: [
    ...listOutput("items", "Matching catalog items"),
    { key: "matched_variation_ids", type: "array", label: "Ids of the variations that matched" },
  ],

  execute(input, ctx) {
    const csv = (v: string | undefined) =>
      (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    return new SquareClient(ctx).request("/catalog/search-catalog-items", {
      body: {
        text_filter: unset(input.textFilter),
        category_ids: csv(input.categoryIds),
        enabled_location_ids: csv(input.enabledLocationIds),
        product_types: input.productTypes,
        archived_state: unset(input.archivedState),
        sort_order: unset(input.sortOrder),
        limit: input.limit,
        cursor: unset(input.cursor),
      },
    });
  },
};

export default catalogSearchItems;
