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
  subscriptionId?: string;
  type?: string;
  status?: string;
  includeDeleted?: boolean;
  sortAttribute?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * `GET /payment_sources` — offset-cursor list of stored payment methods.
 *
 * Reading only. This App does not create, update or delete payment sources: card
 * data has no business crossing a workflow engine, and Chargebee's own
 * recommendation is to capture it through their hosted/tokenised flows rather
 * than an API call carrying a PAN. What a workflow legitimately needs is the
 * `payment_source_id` to charge — and that is what this action returns.
 *
 * ## One filter here is not a filter object
 *
 * `subscription_id` on THIS endpoint is a plain `form`-style scalar
 * (`?subscription_id=abc`), while `customer_id`, `type` and `status` are the
 * usual `deepObject` operator filters (`customer_id[is]=abc`). That asymmetry is
 * in Chargebee's own OpenAPI document, and mirroring the siblings here would
 * produce a `subscription_id[is]` the endpoint does not define.
 *
 * `type` has 50-plus documented values (every wallet, bank rail and local
 * payment method Chargebee supports), so it is a free-text field with the common
 * values named in the hint rather than a select nobody could scan.
 */
const listPaymentSources: ActionDefinition<Input> = {
  key: "list-payment-sources",
  type: "search",
  resource: "payment-source",
  title: "List Payment Sources",
  description:
    "List a customer's stored payment methods and their validity, to find the payment source id " +
    "to charge.",
  params: [
    ...PAGE_PARAMS,
    { key: "customerId", label: "Customer ID", type: "string", hint: "Exact match." },
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      hint: "Exact match. Note this one is a plain parameter on this endpoint, not an operator " +
        "filter like the others.",
    },
    {
      key: "type",
      label: "Type",
      type: "string",
      placeholder: "card",
      hint:
        "Exact match on Chargebee's payment method type. Common values: `card`, `direct_debit`, " +
        "`paypal_express_checkout`, `apple_pay`, `google_pay`, `ideal`, `sofort`, `bancontact`, " +
        "`upi`, `generic`. The full list runs to fifty-plus regional methods.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "valid", label: "Valid" },
        { value: "expiring", label: "Expiring" },
        { value: "expired", label: "Expired" },
        { value: "invalid", label: "Invalid" },
        { value: "pending_verification", label: "Pending verification" },
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
    return ChargebeeClient.fromConnection(ctx).request<ChargebeeList>("/payment_sources", {
      query: {
        limit: input.limit,
        offset: input.offset,
        include_deleted: input.includeDeleted,
        customer_id: filterIs(input.customerId),
        // Plain scalar on this endpoint — deliberately NOT an operator filter.
        subscription_id: input.subscriptionId,
        type: filterIs(input.type),
        status: filterIs(input.status),
        sort_by: sortBy(input.sortAttribute, input.sortOrder),
      },
    });
  },
};

export default listPaymentSources;
