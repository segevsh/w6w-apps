import type { ActionDefinition } from "@w6w/types";
import { GoCardlessClient, type ListPage } from "../lib/client.ts";
import {
  currencyParam,
  dateFilterParams,
  dateFilterQuery,
  listOutput,
  paginationParams,
  sortParams,
} from "../lib/params.ts";

/**
 * `GET /customers` — one page of this merchant's customers.
 *
 * `action_required` is deliberately a two-value string select rather than a
 * boolean: GoCardless documents the parameter as the literal strings `"true"`
 * and `"false"`, so a workflow that renders a checkbox would send `?action_required=`
 * (empty) or `?action_required=1` and get neither of the two documented filters.
 *
 * Pagination is cursor-based like every other list here; see
 * `lib/params.ts#paginationParams` for why `limit` is not clamped.
 */
interface Input {
  limit?: number;
  after?: string;
  before?: string;
  currency?: string;
  actionRequired?: string;
  sortField?: string;
  sortDirection?: string;
  createdAtGt?: string;
  createdAtGte?: string;
  createdAtLt?: string;
  createdAtLte?: string;
}

const listCustomers: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "list-customers",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "Search this GoCardless account's customers, one cursor page at a time.",
  params: [
    ...paginationParams(),
    currencyParam(),
    {
      key: "actionRequired",
      label: "Action required",
      type: "select",
      advanced: true,
      options: [
        { value: "true", label: "Yes — needs an action from you" },
        { value: "false", label: "No" },
      ],
      hint: "Customers GoCardless is holding for a manual action. Sent as the literal string " +
        "GoCardless documents, not as a boolean.",
    },
    ...sortParams("`created_at` and `id`"),
    ...dateFilterParams({ prefix: "createdAt", label: "Created", field: "created_at" }),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new GoCardlessClient(ctx).list("customers", "/customers", {
      limit: input.limit,
      after: input.after,
      before: input.before,
      currency: input.currency,
      action_required: input.actionRequired,
      sort_field: input.sortField,
      sort_direction: input.sortDirection,
      ...dateFilterQuery("created_at", {
        gt: input.createdAtGt,
        gte: input.createdAtGte,
        lt: input.createdAtLt,
        lte: input.createdAtLte,
      }),
    });
  },
};

export default listCustomers;
