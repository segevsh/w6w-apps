import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/order_items` — order line items across the site.
 *
 * Complements `order-get` with `include=order_items`: that answers "what was in
 * *this* order", while this answers "who bought *this thing*" — the
 * `item_type` + `item_id` pair filters every line item for a given offer or
 * product across all orders. Kajabi's documented example for the type is
 * `Offer`.
 */
interface Input {
  siteId?: string;
  itemType?: string;
  itemId?: string;
  unfulfilledOnly?: boolean;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const orderItemList: ActionDefinition<Input> = {
  key: "order-item-list",
  type: "search",
  resource: "order-item",
  title: "List Order Items",
  description:
    "List order line items, optionally filtered to one offer or product — the way to ask who " +
    "bought a particular thing across every order.",
  params: [
    siteFilterParam,
    {
      key: "itemType",
      label: "Item type",
      type: "string",
      placeholder: "Offer",
      hint: "Sent as `filter[item_type_eq]`. Kajabi's documented example value is `Offer`.",
    },
    {
      key: "itemId",
      label: "Item ID",
      type: "string",
      hint: "Sent as `filter[item_id_eq]`. Pair it with the item type above.",
    },
    {
      key: "unfulfilledOnly",
      label: "Unfulfilled only",
      type: "boolean",
      hint: "Sent as `filter[fulfilled_at_null]=true`.",
    },
    sortParam("created_at, quantity, fulfilled_at"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("order_items", "quantity,created_at"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/order_items", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[item_type_eq]": unset(input.itemType),
        "filter[item_id_eq]": unset(input.itemId),
        "filter[fulfilled_at_null]": input.unfulfilledOnly,
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[order_items]": unset(input.fields),
      },
    });
  },
};

export default orderItemList;
