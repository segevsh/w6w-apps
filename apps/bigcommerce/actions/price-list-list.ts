import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, toList } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/pricelists` — the store's price lists.
 *
 * A price list is a named set of per-variant prices, assigned to customer groups
 * or channels — the B2B and multi-currency mechanism. This lists the containers;
 * `price-list-record-list` reads the prices inside one.
 */
interface Input {
  name?: string;
  nameLike?: string;
  ids?: string;
  limit?: number;
  page?: number;
}

const priceListList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "price-list-list",
  type: "search",
  resource: "price-list",
  title: "List Price Lists",
  description:
    "The store's price lists — the containers customer-group and channel pricing hangs off.",
  params: [
    { key: "name", label: "Exact name", type: "string" },
    { key: "nameLike", label: "Name contains", type: "string", hint: "Sent as `name:like`." },
    {
      key: "ids",
      label: "Price list IDs",
      type: "string",
      hint: "Comma-separated. Sent as `id:in`.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Price lists" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/pricelists", {
      query: {
        name: input.name,
        "name:like": input.nameLike,
        "id:in": toList(input.ids),
        limit: input.limit,
        page: input.page,
      },
    });
  },
};

export default priceListList;
