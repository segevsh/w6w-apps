import type { ActionDefinition } from "@w6w/types";
import {
  ChargebeeClient,
  type ChargebeeList,
  filterIs,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  SORT_ORDER_PARAM,
  sortBy,
} from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: string;
  itemId?: string;
  itemFamilyId?: string;
  currencyCode?: string;
  pricingModel?: string;
  status?: string;
  sortAttribute?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * `GET /item_prices` — offset-cursor list of item prices.
 *
 * This is the lookup that makes Create Subscription usable: a subscription is
 * built from `item_price_id` values, and this is where they come from. One item
 * has many item prices — typically one per currency and billing period, which is
 * why ids conventionally read like `silver-USD-monthly`.
 *
 * `pricing_model` is the documented enum `flat_fee`, `per_unit`, `tiered`,
 * `volume`, `stairstep`, and it tells you how the price behaves with quantity —
 * worth filtering on when a workflow only knows how to handle flat or per-unit
 * pricing.
 *
 * **Product Catalog 2.0 only**, like `/items`.
 *
 * `sort_by` accepts `name`, `id` or `updated_at`.
 */
const listItemPrices: ActionDefinition<Input> = {
  key: "list-item-prices",
  type: "search",
  resource: "item-price",
  title: "List Item Prices",
  description:
    "List item prices — the priced, per-currency variants of a catalog item, and the source of " +
    "the item price ids Create Subscription needs. Product Catalog 2.0 only.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "itemId",
      label: "Item ID",
      type: "string",
      hint: "Exact match. Narrows to the prices of one catalog item.",
    },
    { key: "itemFamilyId", label: "Item family ID", type: "string", hint: "Exact match." },
    {
      key: "currencyCode",
      label: "Currency",
      type: "string",
      placeholder: "USD",
      hint: "Exact match on the ISO 4217 code.",
    },
    {
      key: "pricingModel",
      label: "Pricing model",
      type: "select",
      options: [
        { value: "flat_fee", label: "Flat fee — one price regardless of quantity" },
        { value: "per_unit", label: "Per unit" },
        { value: "tiered", label: "Tiered" },
        { value: "volume", label: "Volume" },
        { value: "stairstep", label: "Stairstep" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "deleted", label: "Deleted" },
      ],
    },
    {
      key: "sortAttribute",
      label: "Sort by",
      type: "select",
      options: [
        { value: "name", label: "Name" },
        { value: "id", label: "ID" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    SORT_ORDER_PARAM,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request<ChargebeeList>("/item_prices", {
      query: {
        limit: input.limit,
        offset: input.offset,
        item_id: filterIs(input.itemId),
        item_family_id: filterIs(input.itemFamilyId),
        currency_code: filterIs(input.currencyCode),
        pricing_model: filterIs(input.pricingModel),
        status: filterIs(input.status),
        sort_by: sortBy(input.sortAttribute, input.sortOrder),
      },
    });
  },
};

export default listItemPrices;
