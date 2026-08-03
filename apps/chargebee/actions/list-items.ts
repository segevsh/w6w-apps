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
  itemFamilyId?: string;
  type?: string;
  status?: string;
  name?: string;
  sortAttribute?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * `GET /items` — offset-cursor list of catalog items.
 *
 * An "item" is the product-catalog entity that replaced plans and addons in
 * Product Catalog 2.0. Its `type` says which role it plays: `plan`, `addon` or
 * `charge`. An item carries no price — prices live on `item_price` records
 * hanging off it, which is what the List Item Prices action reads. Together they
 * are how you discover the `item_price_id` values Create Subscription needs.
 *
 * **This endpoint does not exist on a Product Catalog 1.0 site** (its catalog is
 * `/plans` and `/addons`), so it 404s there. The auth `test` hook reports the
 * site's catalog version at connect time so that surfaces early.
 *
 * `sort_by` accepts `name`, `id` or `updated_at` here — a different set from the
 * customer and subscription lists, taken from this endpoint's own parameter.
 */
const listItems: ActionDefinition<Input> = {
  key: "list-items",
  type: "search",
  resource: "item",
  title: "List Items",
  description:
    "List product catalog items (plans, addons and charges), optionally filtered by family, " +
    "type, status or name. Product Catalog 2.0 only.",
  params: [
    ...PAGE_PARAMS,
    { key: "itemFamilyId", label: "Item family ID", type: "string", hint: "Exact match." },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "plan", label: "Plan — the recurring core of a subscription" },
        { value: "addon", label: "Addon — sold alongside a plan" },
        { value: "charge", label: "Charge — a one-time fee" },
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
    { key: "name", label: "Name", type: "string", hint: "Exact match." },
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
    return ChargebeeClient.fromConnection(ctx).request<ChargebeeList>("/items", {
      query: {
        limit: input.limit,
        offset: input.offset,
        item_family_id: filterIs(input.itemFamilyId),
        type: filterIs(input.type),
        status: filterIs(input.status),
        name: filterIs(input.name),
        sort_by: sortBy(input.sortAttribute, input.sortOrder),
      },
    });
  },
};

export default listItems;
