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
  customerId?: string;
  itemId?: string;
  itemPriceId?: string;
  status?: string;
  includeDeleted?: boolean;
  sortAttribute?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * `GET /subscriptions` — offset-cursor list of subscriptions.
 *
 * The `status` values are Chargebee's own enum for this filter, quoted from the
 * parameter's documentation: "Possible values are : future, in_trial, active,
 * non_renewing, paused, cancelled." (`transferred` appears in the underlying
 * schema as a further state a subscription can be in, but the filter's own
 * documented list stops at `cancelled`, so the options here stop there too
 * rather than offering a value the docs do not.)
 *
 * `sort_by` accepts `created_at` or `updated_at` here — the pair this list
 * documents.
 */
const listSubscriptions: ActionDefinition<Input> = {
  key: "list-subscriptions",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "List subscriptions one page at a time, optionally filtered by customer, item, item price " +
    "or status.",
  params: [
    ...PAGE_PARAMS,
    { key: "customerId", label: "Customer ID", type: "string", hint: "Exact match." },
    {
      key: "itemId",
      label: "Item ID",
      type: "string",
      hint: "Exact match. Matches subscriptions containing this item.",
    },
    {
      key: "itemPriceId",
      label: "Item price ID",
      type: "string",
      placeholder: "silver-USD-monthly",
      hint: "Exact match on the plan-item price.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "future", label: "Future — starts on a later date" },
        { value: "in_trial", label: "In trial" },
        { value: "active", label: "Active" },
        { value: "non_renewing", label: "Non-renewing — cancels at term end" },
        { value: "paused", label: "Paused" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    { key: "includeDeleted", label: "Include deleted", type: "boolean" },
    {
      key: "sortAttribute",
      label: "Sort by",
      type: "select",
      options: [
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    SORT_ORDER_PARAM,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request<ChargebeeList>("/subscriptions", {
      query: {
        limit: input.limit,
        offset: input.offset,
        include_deleted: input.includeDeleted,
        customer_id: filterIs(input.customerId),
        item_id: filterIs(input.itemId),
        item_price_id: filterIs(input.itemPriceId),
        status: filterIs(input.status),
        sort_by: sortBy(input.sortAttribute, input.sortOrder),
      },
    });
  },
};

export default listSubscriptions;
