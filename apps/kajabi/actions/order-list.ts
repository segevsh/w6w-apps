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
 * `GET /v1/orders` — what was bought.
 *
 * Keyed by `customer_id`, not by contact — see `customer-list` for why those
 * are different collections in this API.
 *
 * `unfulfilledOnly` maps to `filter[fulfilled_at_null]`, a boolean over a
 * timestamp's nullness: `true` selects orders with no `fulfilled_at`, i.e. the
 * ones still awaiting fulfilment. It is exposed under a plain-English label
 * because "fulfilled at is null" is a database phrase, not a workflow one.
 */
interface Input {
  siteId?: string;
  customerId?: string;
  orderNumber?: string;
  unfulfilledOnly?: boolean;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "List orders, optionally narrowed to one customer, one order number, or to " +
    "orders that have not been fulfilled yet.",
  params: [
    siteFilterParam,
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "`customer-list` returns the ids. Note this is a *customer*, not a contact.",
    },
    { key: "orderNumber", label: "Order number", type: "string" },
    {
      key: "unfulfilledOnly",
      label: "Unfulfilled only",
      type: "boolean",
      hint: "Sent as `filter[fulfilled_at_null]=true` — orders with no fulfilment timestamp.",
    },
    sortParam("order_number, created_at, fulfilled_at"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("orders", "order_number,created_at"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/orders", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[customer_id]": unset(input.customerId),
        "filter[order_number_eq]": unset(input.orderNumber),
        "filter[fulfilled_at_null]": input.unfulfilledOnly,
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[orders]": unset(input.fields),
      },
    });
  },
};

export default orderList;
